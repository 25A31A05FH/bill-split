import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { motion } from 'framer-motion';

import {
  CreditCard,
  Calendar,
  MapPin,
  X,
  Plus,
  Users,
  Check,
  Receipt,
  Sparkles,
  UploadCloud,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ScanLine,
  Layers3,
} from 'lucide-react';

import {
  useExpenses,
} from '../../context/ExpenseContext';


/* =========================================================
   TYPES
========================================================= */

interface AddExpenseProps {
  onSubmit: (
    expense: ExpenseFormData
  ) => void;

  onCancel: () => void;

  defaultGroupId?: string;
}

export interface ExpenseFormData {
  title: string;
  amount: number;
  date: string;
  location: string;
  receiptUrl?: string;

  contributions: {
    userId: string;
    amount: number;
  }[];

  participants: string[];

  groupId?: string;
}


/* =========================================================
   AI RECEIPT TYPES
========================================================= */

interface ReceiptItem {
  name: string;
  quantity?: number | null;
  amount?: number | null;
}

interface AIReceiptResult {
  merchant: string | null;
  totalAmount: number | null;
  date: string | null;
  location: string | null;
  confidence: number;
  items: ReceiptItem[];
}


/* =========================================================
   LM STUDIO CONFIG
========================================================= */

const LM_STUDIO_BASE =
  'http://127.0.0.1:1234/v1';

const DEFAULT_MODEL =
  'qwen/qwen3.5-9b';


/* =========================================================
   IMAGE -> DATA URL
========================================================= */

const imageFileToDataUrl = (
  file: File
): Promise<string> => {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        const original =
          reader.result as string;

        const image =
          new Image();

        image.onload = () => {
          const maxSize = 1600;

          const scale =
            Math.min(
              1,
              maxSize /
                Math.max(
                  image.width,
                  image.height
                )
            );

          const width =
            Math.round(
              image.width * scale
            );

          const height =
            Math.round(
              image.height * scale
            );

          const canvas =
            document.createElement(
              'canvas'
            );

          canvas.width =
            width;

          canvas.height =
            height;

          const context =
            canvas.getContext(
              '2d'
            );

          if (!context) {
            resolve(original);
            return;
          }

          context.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          /*
           * Compress the receipt before:
           *
           * 1. Sending it to Qwen
           * 2. Storing it in localStorage
           */
          const compressed =
            canvas.toDataURL(
              'image/jpeg',
              0.82
            );

          resolve(compressed);
        };

        image.onerror = () => {
          reject(
            new Error(
              'Could not read this image.'
            )
          );
        };

        image.src =
          original;
      };

      reader.onerror = () => {
        reject(
          new Error(
            'Could not load the receipt.'
          )
        );
      };

      reader.readAsDataURL(
        file
      );
    }
  );
};


/* =========================================================
   GET A LOCAL VISION MODEL
========================================================= */

const getVisionModel =
  async (): Promise<string> => {
    try {
      const response =
        await fetch(
          `${LM_STUDIO_BASE}/models`
        );

      if (!response.ok) {
        return DEFAULT_MODEL;
      }

      const data =
        await response.json();

      const modelIds =
        Array.isArray(data?.data)
          ? data.data
              .map(
                (model: {
                  id?: string;
                }) =>
                  model.id
              )
              .filter(
                (
                  id: string | undefined
                ): id is string =>
                  Boolean(id)
              )
          : [];

      /*
       * Prefer the exact Qwen3.5 9B model.
       */
      const qwen35 =
        modelIds.find(
          (id: string) =>
            id
              .toLowerCase()
              .includes(
                'qwen3.5-9b'
              )
        );

      if (qwen35) {
        return qwen35;
      }

      /*
       * Otherwise prefer another
       * Qwen vision model.
       */
      const qwenVision =
        modelIds.find(
          (id: string) => {
            const value =
              id.toLowerCase();

            return (
              value.includes(
                'qwen'
              ) &&
              (
                value.includes(
                  'vl'
                ) ||
                value.includes(
                  'vision'
                ) ||
                value.includes(
                  '3.5'
                )
              )
            );
          }
        );

      if (qwenVision) {
        return qwenVision;
      }

      return (
        modelIds[0] ||
        DEFAULT_MODEL
      );
    } catch {
      return DEFAULT_MODEL;
    }
  };


/* =========================================================
   AI RECEIPT SCAN
========================================================= */

const scanReceiptWithAI =
  async (
    imageDataUrl: string
  ): Promise<AIReceiptResult> => {
    const model =
      await getVisionModel();

    const response =
      await fetch(
        `${LM_STUDIO_BASE}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            model,

            temperature: 0.1,

            // Qwen3.5 is a reasoning model. Disable thinking here so the
            // model spends its output budget on the JSON receipt result.
            // This also prevents finish_reason=length with empty content.
            max_tokens: 2000,

            chat_template_kwargs: {
              enable_thinking: false,
            },

            messages: [
              {
                role: 'system',
                content:
                  `
You are the receipt extraction engine for a roommate expense app.

Analyze the receipt image carefully.

Your job is ONLY to extract information that is visibly supported by the receipt.

Important rules:
- Find the FINAL amount the customer must pay.
- Do NOT use subtotal when a final total exists.
- Do NOT invent values.
- If a value cannot be read, return null.
- Prefer the receipt's printed transaction date.
- Identify the merchant/store name.
- Extract visible line items when possible.
- Return JSON only.
                  `.trim(),
              },

              {
                role: 'user',

                content: [
                  {
                    type: 'text',

                    text:
                      `
Read this receipt and return:

1. merchant
2. final total amount
3. transaction date
4. location if visible
5. visible line items
6. confidence between 0 and 1

The total must represent the FINAL amount payable.

Use this exact JSON structure:
{
  "merchant": string | null,
  "totalAmount": number | null,
  "date": "YYYY-MM-DD" | null,
  "location": string | null,
  "confidence": number,
  "items": [
    {
      "name": string,
      "quantity": number | null,
      "amount": number | null
    }
  ]
}
                      `.trim(),
                  },

                  {
                    type: 'image_url',

                    image_url: {
                      url:
                        imageDataUrl,
                    },
                  },
                ],
              },
            ],

            response_format: {
              type: 'json_schema',

              json_schema: {
                name:
                  'receipt_extraction',

                strict: true,

                schema: {
                  type: 'object',

                  additionalProperties:
                    false,

                  properties: {
                    merchant: {
                      type: [
                        'string',
                        'null',
                      ],
                    },

                    totalAmount: {
                      type: [
                        'number',
                        'null',
                      ],
                    },

                    date: {
                      type: [
                        'string',
                        'null',
                      ],
                    },

                    location: {
                      type: [
                        'string',
                        'null',
                      ],
                    },

                    confidence: {
                      type: 'number',
                    },

                    items: {
                      type: 'array',

                      items: {
                        type: 'object',

                        additionalProperties:
                          false,

                        properties: {
                          name: {
                            type: 'string',
                          },

                          quantity: {
                            type: [
                              'number',
                              'null',
                            ],
                          },

                          amount: {
                            type: [
                              'number',
                              'null',
                            ],
                          },
                        },

                        required: [
                          'name',
                          'quantity',
                          'amount',
                        ],
                      },
                    },
                  },

                  required: [
                    'merchant',
                    'totalAmount',
                    'date',
                    'location',
                    'confidence',
                    'items',
                  ],
                },
              },
            },

            stream: false,
          }),
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        errorText ||
          `LM Studio returned ${response.status}`
      );
    }

    const data =
      await response.json();

    const message =
      data?.choices?.[0]?.message;

    const finishReason =
      data?.choices?.[0]?.finish_reason;

    const raw =
      typeof message?.content === 'string'
        ? message.content.trim()
        : '';

    if (!raw) {
      if (finishReason === 'length') {
        throw new Error(
          'Qwen used the full response limit before returning the receipt JSON. Thinking mode is probably still enabled in LM Studio. Turn off Enable Thinking for Qwen3.5-9B and try again.'
        );
      }

      throw new Error(
        'The AI did not return a receipt result.'
      );
    }

    /*
     * Some local models may wrap
     * JSON in markdown fences.
     */
    const cleaned =
      raw
        .replace(
          /^```json\s*/i,
          ''
        )
        .replace(
          /^```\s*/i,
          ''
        )
        .replace(
          /\s*```$/i,
          ''
        )
        .trim();

    const parsed =
      JSON.parse(
        cleaned
      ) as AIReceiptResult;

    return parsed;
  };


/* =========================================================
   COMPONENT
========================================================= */

const AddExpense: React.FC<
  AddExpenseProps
> = ({
  onSubmit,
  onCancel,
  defaultGroupId,
}) => {
  const {
    users,
    groups,
  } = useExpenses();


  /* =======================================================
     BASIC FORM
  ======================================================= */

  const initialGroup =
    defaultGroupId &&
    groups.some(
      (group) =>
        group.id ===
        defaultGroupId
    )
      ? defaultGroupId
      : groups[0]?.id || '';

  const [
    groupId,
    setGroupId,
  ] = useState(
    initialGroup
  );

  const [
    title,
    setTitle,
  ] = useState('');

  const [
    amount,
    setAmount,
  ] = useState('');

  const [
    date,
    setDate,
  ] = useState(
    new Date()
      .toISOString()
      .split('T')[0]
  );

  const [
    location,
    setLocation,
  ] = useState('');

  const [
    receiptUrl,
    setReceiptUrl,
  ] = useState('');


  /* =======================================================
     AI STATE
  ======================================================= */

  const [
    aiStatus,
    setAiStatus,
  ] = useState<
    'idle' |
    'scanning' |
    'success' |
    'error'
  >('idle');

  const [
    aiError,
    setAiError,
  ] = useState('');

  const [
    aiResult,
    setAiResult,
  ] =
    useState<AIReceiptResult | null>(
      null
    );


  /* =======================================================
     PARTICIPANTS
  ======================================================= */

  const selectedGroup =
    groups.find(
      (group) =>
        group.id ===
        groupId
    );

  const groupMemberIds =
    selectedGroup?.memberIds?.length
      ? selectedGroup.memberIds
      : users.map(
          (user) =>
            user.id
        );

  const groupUsers =
    users.filter(
      (user) =>
        groupMemberIds.includes(
          user.id
        )
    );

  const [
    participants,
    setParticipants,
  ] =
    useState<string[]>(
      groupMemberIds
    );


  /* =======================================================
     CONTRIBUTIONS
  ======================================================= */

  const [
    contributions,
    setContributions,
  ] =
    useState<
      Record<string, string>
    >(() => {
      const initial: Record<
        string,
        string
      > = {};

      groupMemberIds.forEach(
        (userId, index) => {
          initial[userId] =
            index === 0
              ? ''
              : '0';
        }
      );

      return initial;
    });


  /* =======================================================
     GROUP CHANGE
  ======================================================= */

  useEffect(() => {
    if (
      !groupId &&
      groups[0]?.id
    ) {
      setGroupId(
        groups[0].id
      );
    }
  }, [
    groupId,
    groups,
  ]);

  useEffect(() => {
    const validParticipantIds =
      groupMemberIds;

    setParticipants(
      validParticipantIds
    );

    const nextContributions:
      Record<string, string> =
      {};

    validParticipantIds.forEach(
      (userId, index) => {
        nextContributions[
          userId
        ] =
          index === 0
            ? ''
            : '0';
      }
    );

    setContributions(
      nextContributions
    );
  }, [groupId]);


  /* =======================================================
     CONTRIBUTION CALCULATIONS
  ======================================================= */

  const totalContributed =
    useMemo(() => {
      return Object.values(
        contributions
      ).reduce(
        (
          sum,
          value
        ) =>
          sum +
          (Number(value) || 0),
        0
      );
    }, [
      contributions,
    ]);

  const remaining =
    Math.round(
      (
        (Number(amount) ||
          0) -
        totalContributed
      ) * 100
    ) / 100;


  /* =======================================================
     EQUAL SHARE
  ======================================================= */

  const participantShare =
    participants.length >
      0 &&
    Number(amount) > 0
      ? Number(amount) /
        participants.length
      : 0;


  /* =======================================================
     APPLY EQUAL SPLIT
  ======================================================= */

  const applyEqualSplit =
    () => {
      if (
        participants.length ===
          0 ||
        Number(amount) <= 0
      ) {
        return;
      }

      const totalPaise =
        Math.round(
          Number(amount) * 100
        );

      const baseShare =
        Math.floor(
          totalPaise /
            participants.length
        );

      const remainder =
        totalPaise %
        participants.length;

      const next = {
        ...contributions,
      };

      participants.forEach(
        (
          userId,
          index
        ) => {
          const share =
            baseShare +
            (index < remainder
              ? 1
              : 0);

          next[userId] = (
            share / 100
          ).toFixed(2);
        }
      );

      /*
       * Everyone outside the
       * participant list pays 0.
       */
      Object.keys(next).forEach(
        (userId) => {
          if (
            !participants.includes(
              userId
            )
          ) {
            next[userId] =
              '0';
          }
        }
      );

      setContributions(
        next
      );
    };


  /* =======================================================
     TOGGLE PARTICIPANT
  ======================================================= */

  const toggleParticipant =
    (
      userId: string
    ) => {
      setParticipants(
        (current) => {
          const exists =
            current.includes(
              userId
            );

          if (exists) {
            setContributions(
              (previous) => ({
                ...previous,
                [userId]:
                  '0',
              })
            );

            return current.filter(
              (id) =>
                id !== userId
            );
          }

          setContributions(
            (previous) => ({
              ...previous,
              [userId]:
                previous[userId] ||
                '0',
            })
          );

          return [
            ...current,
            userId,
          ];
        }
      );
    };


  /* =======================================================
     CONTRIBUTION UPDATE
  ======================================================= */

  const updateContribution =
    (
      userId: string,
      value: string
    ) => {
      setContributions(
        (current) => ({
          ...current,
          [userId]:
            value,
        })
      );
    };


  /* =======================================================
     FILL REMAINING
  ======================================================= */

  const fillRemainingFor =
    (
      userId: string
    ) => {
      const others =
        Object.entries(
          contributions
        )
          .filter(
            ([id]) =>
              id !== userId
          )
          .reduce(
            (
              sum,
              [, value]
            ) =>
              sum +
              (Number(value) ||
                0),
            0
          );

      const remainingAmount =
        Math.max(
          0,
          (Number(amount) ||
            0) -
            others
        );

      updateContribution(
        userId,
        remainingAmount.toFixed(
          2
        )
      );
    };


  /* =======================================================
     AI RECEIPT SCAN
  ======================================================= */

  const handleReceiptUpload =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      setAiError('');
      setAiResult(null);

      /*
       * PDF can still be attached,
       * but browser-side AI scanning
       * is image based here.
       */
      if (
        file.type ===
        'application/pdf'
      ) {
        setReceiptUrl(
          file.name
        );

        setAiStatus(
          'error'
        );

        setAiError(
          'PDF attached. AI receipt scanning currently works with receipt images. Enter the amount manually for this PDF.'
        );

        return;
      }

      if (
        !file.type.startsWith(
          'image/'
        )
      ) {
        setAiStatus(
          'error'
        );

        setAiError(
          'Please upload a receipt image.'
        );

        return;
      }

      try {
        setAiStatus(
          'scanning'
        );

        /*
         * Compress + store the image.
         */
        const imageDataUrl =
          await imageFileToDataUrl(
            file
          );

        setReceiptUrl(
          imageDataUrl
        );

        /*
         * Ask local Qwen to
         * extract the receipt.
         */
        const result =
          await scanReceiptWithAI(
            imageDataUrl
          );

        setAiResult(
          result
        );

        if (
          result.merchant
        ) {
          setTitle(
            result.merchant
          );
        }

        if (
          typeof result.totalAmount ===
            'number' &&
          result.totalAmount >
            0
        ) {
          setAmount(
            result.totalAmount.toFixed(
              2
            )
          );
        }

        if (
          result.date &&
          /^\d{4}-\d{2}-\d{2}$/.test(
            result.date
          )
        ) {
          setDate(
            result.date
          );
        }

        if (
          result.location
        ) {
          setLocation(
            result.location
          );
        }

        setAiStatus(
          'success'
        );
      } catch (error) {
        console.error(
          'Receipt AI error:',
          error
        );

        setAiStatus(
          'error'
        );

        if (
          error instanceof Error
        ) {
          setAiError(
            error.message
          );
        } else {
          setAiError(
            'Could not scan this receipt.'
          );
        }
      }
    };


  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !title.trim()
    ) {
      alert(
        'Please enter an expense title.'
      );
      return;
    }

    if (
      !amount ||
      Number(amount) <=
        0
    ) {
      alert(
        'Please enter a valid amount.'
      );
      return;
    }

    if (!groupId) {
      alert(
        'Please select a group.'
      );
      return;
    }

    if (
      participants.length ===
      0
    ) {
      alert(
        'Select at least one participant.'
      );
      return;
    }

    if (
      Math.abs(
        remaining
      ) > 0.01
    ) {
      alert(
        `Contributions must equal the total expense. Remaining: ₹${remaining.toFixed(
          2
        )}`
      );
      return;
    }

    const contributionList =
      users
        .filter(
          (user) =>
            groupMemberIds.includes(
              user.id
            )
        )
        .map(
          (user) => ({
            userId:
              user.id,

            amount:
              Number(
                contributions[
                  user.id
                ]
              ) || 0,
          })
        )
        .filter(
          (item) =>
            item.amount > 0
        );

    onSubmit({
      title:
        title.trim(),

      amount:
        Number(amount),

      date,

      location:
        location.trim(),

      receiptUrl,

      contributions:
        contributionList,

      participants,

      groupId,
    });
  };


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
    >

      <motion.div
        initial={{
          opacity: 0,
          y: 25,
          scale: 0.97,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"
      >

        {/* ===============================================
            HEADER
        =============================================== */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl">

          <div>

            <p className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              <Sparkles className="h-4 w-4" />
              ROOMMATE AI
            </p>

            <h2 className="mt-1 text-2xl font-bold text-white">
              Add Expense
            </h2>

            <p className="mt-1 text-sm text-white/40">
              Scan a receipt or enter the expense manually.
            </p>

          </div>


          <button
            type="button"
            onClick={
              onCancel
            }
            className="rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

        </div>


        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-7 p-6"
        >


          {/* =============================================
              AI RECEIPT SCANNER
          ============================================= */}

          <section className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.08] via-white/[0.025] to-cyan-400/[0.04] p-5">

            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-400/[0.05] blur-3xl" />

            <div className="relative">

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

                <div>

                  <div className="flex items-center gap-2">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10">
                      <ScanLine className="h-5 w-5 text-emerald-400" />
                    </div>

                    <div>

                      <h3 className="font-semibold text-white">
                        Scan receipt with AI
                      </h3>

                      <p className="text-xs text-white/35">
                        Powered locally by your Qwen vision model
                      </p>

                    </div>

                  </div>

                </div>


                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-white/90">

                  <UploadCloud className="h-4 w-4" />

                  Upload receipt

                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={
                      handleReceiptUpload
                    }
                    className="hidden"
                  />

                </label>

              </div>


              {/* SCANNING */}
              {aiStatus ===
                'scanning' && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] p-4">

                  <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />

                  <div>
                    <p className="text-sm font-medium text-white">
                      Reading your receipt...
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      Qwen is extracting the merchant, final amount, date and items.
                    </p>
                  </div>

                </div>
              )}


              {/* SUCCESS */}
              {aiStatus ===
                'success' &&
                aiResult && (
                  <div className="mt-5 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.035] p-4">

                    <div className="flex items-start gap-3">

                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center justify-between gap-2">

                          <div>

                            <p className="text-sm font-semibold text-white">
                              Receipt detected
                            </p>

                            <p className="mt-1 text-xs text-white/30">
                              Review the values below before saving.
                            </p>

                          </div>

                          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
                            {Math.round(
                              Math.max(
                                0,
                                Math.min(
                                  1,
                                  aiResult.confidence
                                )
                              ) * 100
                            )}
                            % confidence
                          </span>

                        </div>


                        <div className="mt-4 grid gap-3 sm:grid-cols-3">

                          <div className="rounded-xl bg-black/20 p-3">

                            <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                              Merchant
                            </p>

                            <p className="mt-1 truncate text-sm font-semibold text-white">
                              {aiResult.merchant ||
                                'Not detected'}
                            </p>

                          </div>


                          <div className="rounded-xl bg-black/20 p-3">

                            <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                              Final total
                            </p>

                            <p className="mt-1 text-sm font-semibold text-emerald-400">
                              {typeof aiResult.totalAmount ===
                                'number'
                                ? `₹${aiResult.totalAmount.toFixed(
                                    2
                                  )}`
                                : 'Not detected'}
                            </p>

                          </div>


                          <div className="rounded-xl bg-black/20 p-3">

                            <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                              Items
                            </p>

                            <p className="mt-1 text-sm font-semibold text-white">
                              {
                                aiResult
                                  .items
                                  .length
                              }
                            </p>

                          </div>

                        </div>


                        {aiResult.items.length >
                          0 && (
                          <div className="mt-4">

                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">
                              Detected items
                            </p>

                            <div className="flex flex-wrap gap-2">

                              {aiResult.items
                                .slice(
                                  0,
                                  8
                                )
                                .map(
                                  (
                                    item,
                                    index
                                  ) => (
                                    <span
                                      key={`${item.name}-${index}`}
                                      className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-white/55"
                                    >
                                      {item.quantity &&
                                      item.quantity >
                                        1
                                        ? `${item.quantity}× `
                                        : ''}
                                      {
                                        item.name
                                      }

                                      {typeof item.amount ===
                                        'number' &&
                                        ` · ₹${item.amount.toFixed(
                                          2
                                        )}`}
                                    </span>
                                  )
                                )}

                            </div>

                          </div>
                        )}

                      </div>

                    </div>

                  </div>
                )}


              {/* ERROR */}
              {aiStatus ===
                'error' &&
                aiError && (
                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">

                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />

                    <div>

                      <p className="text-sm font-medium text-white">
                        AI scan needs attention
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/35">
                        {aiError}
                      </p>

                    </div>

                  </div>
                )}


              {/* RECEIPT PREVIEW */}
              {receiptUrl &&
                receiptUrl.startsWith(
                  'data:image'
                ) && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08]">

                    <img
                      src={
                        receiptUrl
                      }
                      alt="Uploaded receipt"
                      className="max-h-72 w-full object-contain bg-black/30"
                    />

                  </div>
                )}

            </div>

          </section>


          {/* =============================================
              GROUP
          ============================================= */}

          <section>

            <div className="mb-3 flex items-center gap-2">

              <Layers3 className="h-5 w-5 text-emerald-400" />

              <div>

                <h3 className="font-semibold text-white">
                  Expense group
                </h3>

                <p className="text-xs text-white/35">
                  Choose where this expense belongs.
                </p>

              </div>

            </div>


            <select
              value={
                groupId
              }
              onChange={(
                event
              ) =>
                setGroupId(
                  event.target
                    .value
                )
              }
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40 focus:ring-4 focus:ring-emerald-400/5"
            >

              {groups.map(
                (group) => (
                  <option
                    key={
                      group.id
                    }
                    value={
                      group.id
                    }
                  >
                    {
                      group.name
                    }
                  </option>
                )
              )}

            </select>

          </section>


          {/* =============================================
              BASIC DETAILS
          ============================================= */}

          <div className="space-y-5">

            <div>

              <label className="mb-2 block text-sm font-medium text-white/70">
                Expense name
              </label>

              <input
                value={
                  title
                }
                onChange={(
                  event
                ) =>
                  setTitle(
                    event.target
                      .value
                  )
                }
                placeholder="Electricity, groceries, dinner..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
              />

            </div>


            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium text-white/70">
                  Total amount
                </label>

                <div className="relative">

                  <CreditCard className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      amount
                    }
                    onChange={(
                      event
                    ) =>
                      setAmount(
                        event.target
                          .value
                      )
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white outline-none placeholder:text-white/25 focus:border-emerald-400/50"
                  />

                </div>

              </div>


              <div>

                <label className="mb-2 block text-sm font-medium text-white/70">
                  Date
                </label>

                <div className="relative">

                  <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />

                  <input
                    type="date"
                    value={
                      date
                    }
                    onChange={(
                      event
                    ) =>
                      setDate(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white outline-none focus:border-emerald-400/50"
                  />

                </div>

              </div>

            </div>


            <div>

              <label className="mb-2 block text-sm font-medium text-white/70">
                Location
              </label>

              <div className="relative">

                <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />

                <input
                  value={
                    location
                  }
                  onChange={(
                    event
                  ) =>
                    setLocation(
                      event.target
                        .value
                    )
                  }
                  placeholder="PG, supermarket, restaurant..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white outline-none placeholder:text-white/25 focus:border-emerald-400/50"
                />

              </div>

            </div>

          </div>


          {/* =============================================
              PARTICIPANTS
          ============================================= */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

              <div className="flex items-start gap-2">

                <Users className="mt-0.5 h-5 w-5 text-blue-400" />

                <div>

                  <h3 className="font-semibold text-white">
                    Who participated?
                  </h3>

                  <p className="text-sm text-white/40">
                    Select everyone who should share this expense.
                  </p>

                </div>

              </div>


              {participants.length >
                0 &&
                Number(amount) >
                  0 && (
                  <button
                    type="button"
                    onClick={
                      applyEqualSplit
                    }
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-400/10 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-400/15"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Split equally
                  </button>
                )}

            </div>


            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

              {groupUsers.map(
                (user) => {
                  const selected =
                    participants.includes(
                      user.id
                    );

                  return (
                    <button
                      key={
                        user.id
                      }
                      type="button"
                      onClick={() =>
                        toggleParticipant(
                          user.id
                        )
                      }
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                        selected
                          ? 'border-emerald-400/40 bg-emerald-500/10'
                          : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                      }`}
                    >

                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          selected
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white/10 text-white/50'
                        }`}
                      >

                        {selected ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          user.name.charAt(
                            0
                          )
                        )}

                      </div>


                      <div className="flex-1">

                        <p className="font-medium text-white">
                          {
                            user.name
                          }
                        </p>

                        {selected &&
                          participantShare >
                            0 && (
                            <p className="text-xs text-emerald-400">
                              Share ₹
                              {participantShare.toFixed(
                                2
                              )}
                            </p>
                          )}

                      </div>

                    </button>
                  );
                }
              )}

            </div>


            {/* AI SHARE SUGGESTION */}
            {participants.length >
              0 &&
              Number(amount) >
                0 && (
                <div className="mt-4 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.035] p-4">

                  <div className="flex items-start gap-3">

                    <Sparkles className="mt-0.5 h-4 w-4 text-cyan-400" />

                    <div>

                      <p className="text-sm font-medium text-white">
                        Suggested split
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/35">
                        {participants.length}{' '}
                        {participants.length ===
                        1
                          ? 'person'
                          : 'people'}{' '}
                        selected · ₹
                        {participantShare.toFixed(
                          2
                        )}{' '}
                        each

                      </p>

                    </div>

                  </div>

                </div>
              )}

          </section>


          {/* =============================================
              CONTRIBUTIONS
          ============================================= */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <div className="mb-4 flex items-center justify-between gap-4">

              <div>

                <div className="flex items-center gap-2">

                  <Receipt className="h-5 w-5 text-emerald-400" />

                  <h3 className="font-semibold text-white">
                    Who contributed?
                  </h3>

                </div>

                <p className="mt-1 text-sm text-white/40">
                  Enter the actual money each roommate paid.
                </p>

              </div>


              <div
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  Math.abs(
                    remaining
                  ) < 0.01
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-400'
                }`}
              >

                {remaining >=
                0
                  ? `₹${remaining.toFixed(
                      2
                    )} remaining`
                  : `₹${Math.abs(
                      remaining
                    ).toFixed(
                      2
                    )} over`}

              </div>

            </div>


            <div className="space-y-3">

              {groupUsers.map(
                (user) => (
                  <div
                    key={
                      user.id
                    }
                    className="flex flex-col gap-3 rounded-xl border border-white/5 bg-slate-950/40 p-3 sm:flex-row sm:items-center"
                  >

                    <div className="flex min-w-0 flex-1 items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-semibold text-emerald-300">
                        {user.name.charAt(
                          0
                        )}
                      </div>

                      <div className="min-w-0">

                        <p className="truncate font-medium text-white">
                          {
                            user.name
                          }
                        </p>

                        <p className="text-xs text-white/35">
                          contributed
                        </p>

                      </div>

                    </div>


                    <div className="flex items-center gap-2">

                      <div className="relative w-full sm:w-32">

                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/30">
                          ₹
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            contributions[
                              user.id
                            ] ??
                            '0'
                          }
                          onChange={(
                            event
                          ) =>
                            updateContribution(
                              user.id,
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="0"
                          className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-7 pr-2 text-right text-white outline-none focus:border-emerald-400/50"
                        />

                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          fillRemainingFor(
                            user.id
                          )
                        }
                        className="rounded-lg bg-white/5 px-2 py-2 text-xs text-white/60 transition hover:bg-emerald-500/10 hover:text-emerald-400"
                      >
                        Fill
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>


            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm">

              <span className="text-white/40">
                Total contributed
              </span>

              <span className="font-semibold text-white">
                ₹
                {totalContributed.toFixed(
                  2
                )}
                {' / '}
                ₹
                {(
                  Number(
                    amount
                  ) || 0
                ).toFixed(
                  2
                )}
              </span>

            </div>

          </section>


          {/* =============================================
              MANUAL RECEIPT STATUS
          ============================================= */}

          {receiptUrl &&
            !receiptUrl.startsWith(
              'data:image'
            ) && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">

                <div className="flex items-center gap-3">

                  <Receipt className="h-5 w-5 text-white/40" />

                  <div>

                    <p className="text-sm font-medium text-white">
                      Receipt attached
                    </p>

                    <p className="text-xs text-white/35">
                      {receiptUrl}
                    </p>

                  </div>

                </div>

              </div>
            )}


          {/* =============================================
              ACTIONS
          ============================================= */}

          <div className="flex gap-3 border-t border-white/10 pt-5">

            <button
              type="button"
              onClick={
                onCancel
              }
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-white transition hover:bg-white/10"
            >
              Cancel
            </button>


            <motion.button
              whileHover={{
                scale: 1.01,
              }}
              whileTap={{
                scale: 0.99,
              }}
              type="submit"
              disabled={
                !title.trim() ||
                !amount ||
                participants.length ===
                  0 ||
                Math.abs(
                  remaining
                ) > 0.01
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition disabled:cursor-not-allowed disabled:opacity-40"
            >

              <Plus className="h-5 w-5" />

              Add Expense

            </motion.button>

          </div>

        </form>

      </motion.div>

    </motion.div>
  );
};


export default AddExpense;
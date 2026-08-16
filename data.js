const GAME_DATA = {
  meta: {
    place: "ANAND, GUJARAT",
    year: "1946"
  },

  intro: [
    { type: "place" },
    {
      type: "text",
      text: "Milk is plentiful.\nYet every family grows poorer."
    },
    {
      type: "text",
      text: "Tomorrow the village gathers.\nTonight you have one chance to discover why."
    }
  ],

  locations: {
    home: {
      id: "home",
      name: "Kasturba's House",
      sub: "Household Perspective",
      x: 18,
      y: 72,
      speaker: "Kasturba Ben (The Mother)",
      portrait: "mother",
      lines: [
        "The milk came back under-measured from the contractor depot again today.",
        "We sent 14 seers of fresh morning milk, yet they only credited us for 8 seers, claiming 'fat variance'.",
        "With contractor payouts cut to 1 Rupee 6 Annas, medicine and cattle feed are becoming unaffordable for our children.",
        "Go to the Collection Depot. Ask why our hard-earned milk is being devalued while Bombay prices skyrocket."
      ],
      clue: {
        id: "receipt",
        name: "Milk Receipt #1402"
      }
    },

    collection: {
      id: "collection",
      name: "Collection Depot",
      sub: "Grassroots Organization",
      x: 38,
      y: 48,
      speaker: "Sharda Ben (Cooperative Supervisor)",
      portrait: "supervisor",
      lines: [
        "Keep your voice steady. We log every bucket by hand in this ledger.",
        "Look at the Receiving Log. The contractor arbitrarily rejects full cans at 08:15 AM once their daily pasteurizer quota is filled.",
        "Polson's monopoly takes a 75% profit margin in Bombay while local farming families bear 100% of the spoilage losses."
      ],
      clue: {
        id: "rejectedLog",
        name: "Rejected Milk Log"
      }
    },

    buyer: {
      id: "buyer",
      name: "Buyer's Office",
      sub: "Market & Contractor Logistics",
      x: 77,
      y: 36,
      speaker: "Gautam Seth & Mr. Deshmukh (Contractor Rep)",
      portrait: "buyer",
      lines: [
        "We pasteurise milk here under an exclusive government contract for the Bombay Municipal Milk Scheme.",
        "The Bombay Government pays us 12 Annas per seer. But local transport, refrigeration, and urban distribution are expensive.",
        "We pay what the market contract permits. Centralized procurement is efficient—individual farmers cannot handle rail logistics alone."
      ],
      clue: {
        id: "ledger",
        name: "Polson Price Ledger"
      }
    },

    railway: {
      id: "railway",
      name: "Railway Freight Yard",
      sub: "Transport & Future Generation",
      x: 70,
      y: 70,
      speaker: "B.B. & C.I. Railway Guard & Bhikhabhai",
      portrait: "railway",
      lines: [
        "My mother leaves before sunrise every morning to carry milk cans. We don't get to keep milk at home anymore...",
        "The contractor claims there is no rail space for Kaira milk. But look at these B.B.&C.I. Railway waybills!",
        "Wagon #428 is dispatched to Bombay only half-full. They have plenty of carriage space—the bottleneck is a deliberate excuse to keep buy-prices low."
      ],
      clue: {
        id: "manifest",
        name: "Freight Manifest #428"
      }
    },

    hall: {
      id: "hall",
      name: "Village Panchayat Hall",
      sub: "Community Facilitation",
      x: 52,
      y: 22,
      speaker: "Motibhai Patel (Village Elder)",
      portrait: "elder",
      lines: [
        "The village council has gathered to hear your investigation findings.",
        "I am here to facilitate, not to issue commands. The decision belongs to all of us.",
        "Present your evidence. Show us whether we must accept contractor terms or unite under Sardar Patel's advice to form our own cooperative."
      ],
      clue: {
        id: "petition",
        name: "Farmer Union Petition"
      }
    }
  },

  notebook: {
    receipt:
      "<br><br>[Historically Reconstructed]<br>A receipt showing a payout of Rs. 1/6/0 for 8 seers credited, charging 6 Pice handling levy per seer.",

    ledger:
      "<br><br>[Historically Documented Rates]<br>A Polson Anand factory ledger sheet showing a purchase rate of 12 Annas/seer from Bombay vs. 3 Annas/seer paid to Kaira farmers.",

    rejectedLog:
      "<br><br>[Historically Reconstructed]<br>A receiving log showing multiple milk batches rejected as 'sour' at exactly 08:15 AM due to plant intake limits.",

    manifest:
      "<br><br>[Historically Reconstructed]<br>A BB&CI freight waybill listing Wagon #428 carrying milk to Bombay at only 45% loaded capacity.",

    petition:
      "<br><br>[Historically Documented Resolution]<br>A signed farmer petition. The reverse contains Sardar Patel's advice to form a cooperative union and strike."
  },

  board: {
    nodes: [
      "receipt",
      "ledger",
      "rejectedLog",
      "manifest",
      "petition"
    ],

    pairs: [
      {
        id: "p1",
        a: "receipt",
        b: "ledger",
        deduction: "The buyer takes a massive 9-Anna margin while charging farmers handling fees.",
        sentence: {
          text: "The contractor is utilising [ _____ ] to pay local farmers only [ _____ ] of the price paid by the Bombay Government.",
          blanks: [
            {
              answer: "handling deductions",
              choices: ["handling deductions", "transport losses", "poor fat content"]
            },
            {
              answer: "a quarter",
              choices: ["a quarter", "half", "one-tenth"]
            }
          ]
        }
      },

      {
        id: "p2",
        a: "ledger",
        b: "manifest",
        deduction: "Transport space is not scarce; the bottleneck is an excuse to maintain low rates.",
        sentence: {
          text: "Although Polson claims shipping is full and scarce, railway logs show freight wagons are leaving [ _____ ], revealing the transport bottleneck is [ _____ ].",
          blanks: [
            {
              answer: "half empty",
              choices: ["half empty", "fully loaded", "delayed"]
            },
            {
              answer: "a fabrication",
              choices: ["a fabrication", "accurate", "temporary"]
            }
          ]
        }
      },

      {
        id: "p3",
        a: "rejectedLog",
        b: "ledger",
        deduction: "Arbitrary rejections at 08:15 AM protect Polson's daily pasteurizer capacity.",
        sentence: {
          text: "The receiving log reveals that milk is being rejected [ _____ ] to enforce a daily [ _____ ] rather than based on actual quality tests.",
          blanks: [
            {
              answer: "at exactly 08:15 AM",
              choices: ["at exactly 08:15 AM", "after three hours", "due to souring"]
            },
            {
              answer: "procurement quota",
              choices: ["procurement quota", "railway schedule", "price discount"]
            }
          ]
        }
      },

      {
        id: "p4",
        a: "petition",
        b: "receipt",
        deduction: "Sardar Patel's guidance: bypass the middlemen and establish collective ownership.",
        sentence: {
          text: "Sardar Patel's advice suggests that to end poverty, farmers must not beg for better rates, but establish their own [ _____ ] to control [ _____ ].",
          blanks: [
            {
              answer: "cooperative union",
              choices: ["cooperative union", "railway wagon", "private depot"]
            },
            {
              answer: "distribution and sales",
              choices: ["distribution and sales", "cattle feed quality", "government regulations"]
            }
          ]
        }
      }
    ],

    wrongDeductions: [
      "Those facts don't match the historical records.",
      "The dates or numbers contradict this hypothesis.",
      "That connection doesn't explain the economic forces.",
      "Look closely at the document measurements."
    ],

    finalDeduction:
      "The monopoly relies on arbitrary quotas, double-billing, and price margin suppression. Collective ownership is the only path to independence."
  },

  meeting: {
    question: "The village council is waiting. Present your evidence and make your recommendation.",
    options: [
      {
        id: "accept",
        text: "Accept the contractor's rates.",
        response: "The monopoly remains. The village remains in debt while Polson profits.",
        correct: false
      },
      {
        id: "cooling",
        text: "Invest in local storage only.",
        response: "Storage helps reduce waste, but Polson still controls the price at the gate.",
        correct: false
      },
      {
        id: "cooperative",
        text: "Establish a cooperative and strike.",
        response: "Exactly. By setting up a cooperative to pasteurize and sell direct, you bypass Polson entirely.",
        correct: true
      }
    ]
  },

  endings: {
    accept: {
      title: "Ending I — Acceptance",
      body: [
        "The farmers continue selling through Polson's agents.",
        "Anand remains a passive procurement depot.",
        "Prosperity never reaches the producers."
      ]
    },

    cooling: {
      title: "Ending II — Partial Relief",
      body: [
        "Storage tanks reduce immediate spoilage.",
        "But without price control, the economic model is unchanged.",
        "The farmers remain dependent on private middlemen."
      ]
    },

    cooperative: {
      title: "Ending III — The Birth of AMUL",
      body: [
        "In late 1946, Anand's farmers establish the Kaira Co-operative Union.",
        "They refuse to sell milk to Polson, initiating a historic strike.",
        "This cooperative action marks the foundation of the movement that would become AMUL."
      ]
    }
  }
};
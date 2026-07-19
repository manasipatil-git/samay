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
      name: "Home",
      sub: "Your family's house",
      x: 18,
      y: 72,
      speaker: "Mother",
      portrait: "mother",
      lines: [
        "The milk came back again from the depot today.",
        "We sent 14 seers of fresh milk...",
        "Yet they only credited us for 8 seers, claiming variance.",
        "Go to the Collection Centre. Ask why our payout is only 1 Rupee 6 Annas."
      ],
      clue: {
        id: "receipt",
        name: "Milk Receipt"
      }
    },

    buyer: {
      id: "buyer",
      name: "Buyer's Office",
      sub: "Private contractor",
      x: 77,
      y: 36,
      speaker: "Buyer",
      portrait: "buyer",
      lines: [
        "We pasteurise the milk here and ship it to the Bombay Municipal Milk Scheme.",
        "The government pays us a contract rate of 12 Annas per seer.",
        "But local transport and handling are extremely expensive for us.",
        "We pay what we can. Take your complaints to the Village Hall if you must."
      ],
      clue: {
        id: "ledger",
        name: "Price Ledger"
      }
    },

    collection: {
      id: "collection",
      name: "Collection Centre",
      sub: "Milk depot",
      x: 38,
      y: 48,
      speaker: "Collection Worker",
      portrait: "worker",
      lines: [
        "Keep your voice down. We only log what the agent tells us.",
        "Look at the Receiving Log. We turn away cans once the quota is hit.",
        "The contractor blames transport limits. Go ask the Station master, or visit the Buyer's Office."
      ],
      clue: {
        id: "rejectedLog",
        name: "Rejected Milk Log"
      }
    },

    railway: {
      id: "railway",
      name: "Railway Station",
      sub: "Freight Yard",
      x: 70,
      y: 70,
      speaker: "Railway Worker",
      portrait: "worker2",
      lines: [
        "The contractor keeps claiming they lack rail space for Kaira milk.",
        "But look at our waybills. Wagon #428 is dispatched half-empty to Bombay.",
        "They have plenty of carriage space. Why lie to the farmers?"
      ],
      clue: {
        id: "manifest",
        name: "Freight Manifest"
      }
    },

    hall: {
      id: "hall",
      name: "Village Hall",
      sub: "Meeting Place",
      x: 52,
      y: 22,
      speaker: "Village Elder",
      portrait: "elder",
      lines: [
        "Tomorrow, on January 4, we decide our future here in the council.",
        "Bring the evidence from your desk. We must show the village why we are in debt."
      ],
      clue: {
        id: "petition",
        name: "Village Petition"
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
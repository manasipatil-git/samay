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
        "The milk came back again.",
        "We worked all week...",
        "Yet we still owe money.",
        "Something isn't right."
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
        "Transportation is expensive.",
        "Prices cannot increase.",
        "You villagers simply don't understand the costs."
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
        "Keep your voice down.",
        "Some cans are rejected before they're even opened.",
        "No one asks why."
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
        "Funny thing...",
        "Half the trains leave with empty space.",
        "So why do they keep blaming transport?"
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
        "Tomorrow we decide our future.",
        "Come only when you understand the truth."
      ],
      clue: {
        id: "petition",
        name: "Village Petition"
      }
    }
  },

  notebook: {
    receipt:
      "<br><br>The family sold plenty of milk, but payment was unexpectedly low.",

    ledger:
      "<br><br>The buyer insists transport costs are the reason for low prices.",

    rejectedLog:
      "<br><br>Milk is being rejected before inspection. Someone controls what reaches the market.",

    manifest:
      "<br><br>The railway records show many freight wagons leave partly empty.",

    petition:
      "<br><br>The village is ready for change—but no one yet knows the answer."
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
        deduction:
          "Low payments don't match the buyer's explanation."
      },

      {
        id: "p2",
        a: "ledger",
        b: "manifest",
        deduction:
          "Transport is not as expensive as claimed."
      },

      {
        id: "p3",
        a: "rejectedLog",
        b: "ledger",
        deduction:
          "The buyer controls which milk reaches the market."
      },

      {
        id: "p4",
        a: "petition",
        b: "receipt",
        deduction:
          "The village needs a different system—not better production."
      }
    ],

    wrongDeductions: [
      "Those clues don't support each other.",
      "There isn't enough evidence yet.",
      "That connection doesn't explain the problem.",
      "Try comparing economic evidence instead.",
      "Look for contradictions."
    ],

    finalDeduction:
      "The problem isn't milk production. The problem is market control."
  },

  meeting: {
  question:
    "You've gathered every clue. What should the village do?",

  options: [
    {
      id: "accept",
      text: "Accept the buyer's prices.",
      response:
        "Nothing changes. Farmers remain dependent on the middleman.",
      correct: false
    },

    {
      id: "cooling",
      text: "Improve storage and transport.",
      response:
        "Better storage helps, but it doesn't solve who controls the prices.",
      correct: false
    },

    {
      id: "cooperative",
      text: "Form a farmer-owned cooperative.",
      response:
        "Exactly. If the farmers own collection, processing and sales together, no middleman can exploit them.",
      correct: true
    }
  ]
},

  endings: {
    accept: {
      title: "Ending I — Acceptance",
      body: [
        "The villagers reluctantly accept the lower prices.",
        "For a while, life continues exactly as before.",
        "Milk flows. Prosperity never does."
      ]
    },

    cooling: {
      title: "Ending II — Better Storage",
      body: [
        "Cooling helps reduce waste.",
        "But the buyer still controls prices.",
        "The real problem remains unsolved."
      ]
    },

    cooperative: {
      title: "Ending III — A New Beginning",
      body: [
        "The villagers decide to work together.",
        "Instead of selling through middlemen, they create a cooperative owned by farmers themselves.",
        "This decision marks the beginning of the movement that would eventually become AMUL."
      ]
    }
  }
};
export const SUBSTANCES = {
  estradiol: {
    categoryName: "Estradiol",
    unit: "mg",
    bloodUnit: "pg/mL",
    esters: {
      benzoate: {
        name: "Estradiol Benzoate",
        ka: 2.5,
        ke: 0.55,
        scale: 195,
        defaultDose: 1,
      },
      valerate: {
        name: "Estradiol Valerate",
        ka: 0.75,
        ke: 0.23,
        scale: 59,
        defaultDose: 4,
      },
      cypionate: {
        name: "Estradiol Cypionate",
        ka: 0.4,
        ke: 0.1,
        scale: 28.0,
        defaultDose: 5,
      },
      enanthate: {
        name: "Estradiol Enanthate",
        ka: 0.45,
        ke: 0.1,
        scale: 29.0,
        defaultDose: 5,
      },
      undecylate: {
        name: "Estradiol Undecylate",
        ka: 0.26,
        ke: 0.033,
        scale: 10.6,
        defaultDose: 15,
      },
    },
  },
  testosterone: {
    categoryName: "Testosterone",
    unit: "mg",
    bloodUnit: "ng/dL",
    esters: {
      cypionate: {
        name: "Testosterone Cypionate",
        ka: 0.098,
        ke: 1,
        scale: 4.3,
        defaultDose: 100,
      },
      enanthate: {
        name: "Testosterone Enanthate",
        ka: 2.44,
        ke: 0.18,
        scale: 5.25,
        defaultDose: 100,
      },
      undecanoate: {
        name: "Testosterone Undecanoate",
        ka: 4.537292,
        ke: 0.024048,
        scale: 5.279689,
        defaultDose: 200,
      },
    },
  },
};

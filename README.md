# Dosecalc ✨

Injection dosage calculator. It is strictly designed to help accurately calculate injection volumes and units for medications such as **insulin, hrt, peptides, or any other liquid injectables**. 

It also includes a **Blood Level Simulator** for monitoring hormone levels (Estradiol and Testosterone) over time based on various dosing protocols.

You can access the tools [here](https://pengwius.github.io/dosecalc/).

## Mathematical Model (Bateman Function)

The hormone concentration simulation is based on the **Bateman function**, which models the pharmacokinetics of drugs administered extravascularly.

The concentration $C(t)$ at time $t$ for a single dose is described by:

$$C(t) = \frac{Scale \cdot Dose \cdot ka}{ka - ke} \cdot (e^{-ke \cdot t} - e^{-ka \cdot t})$$

Where:
* **$ka$ (absorption rate constant)**: the rate at which the substance enters the bloodstream.
* **$ke$ (elimination rate constant)**: the rate at which the substance is eliminated from the body.
* **$Scale$**: a scaling factor normalizing the dose to the predicted peak concentration.

For complex protocols (multiple doses), the simulation calculates the **superposition** of concentrations from all administered doses:

$$C_{total}(t) = \sum_{i} C_i(t - t_i)$$

The system also accounts for feedback loops affecting the HPG (Hypothalamic-Pituitary-Gonadal) axis. It dynamically adjusts endogenous hormone production based on the concentration of exogenous hormones, utilizing an inertia-based suppression model that reflects the biological regulatory process. Specifically, the simulation computes cross-hormonal suppression (e.g., exogenous Estradiol suppressing endogenous Testosterone, and vice-versa), ensuring that endogenous levels are downregulated according to the total hormonal load.

## Credits 🎀
Made with ❤️ by [pengwius](https://github.com/pengwius).

Icons made by [Candy Design](https://www.flaticon.com/authors/candy-design) from [www.flaticon.com](https://www.flaticon.com/).

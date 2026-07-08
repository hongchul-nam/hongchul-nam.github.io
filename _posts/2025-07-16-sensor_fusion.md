---
layout: post
title: Sensor Fusion for VOC Sensor
date: 2025-07-16 12:00:00
hidden: true
description: A detailed derivation of MPPI
tags: [Bayesian]
categories: [control]
---

### 1 General Mathematical Formulation: MOS Sensor Arrays as a Nonlinear Inverse Problem

Let us consider a sensor array consisting of $M$ metal-oxide semiconductor (MOS) sensors, each exposed to a mixture of $K$ volatile organic compounds (VOCs). The goal is to infer the concentration vector $c \in \mathbb{R}^K$ of the VOCs from the observed sensor signals.

#### 1.1 Forward Model

For each sensor $m \in \{1, \ldots, M\}$, the observed signal $s_m \in \mathbb{R}^{d_m}$ (possibly multidimensional) is modeled as:

$$
s_m = f_m\left(c; \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}\right) + \epsilon_m
$$

where:

- $f_m: \mathbb{R}^K \times \mathcal{N}_m^{\mathrm{int}} \times \mathcal{N}^{\mathrm{ext}} \to \mathbb{R}^{d_m}$ is a general (possibly nonlinear, non-invertible) function describing the response of sensor $m$,
- $c \in \mathbb{R}^K$ is the vector of VOC concentrations,
- $\nu^{\mathrm{int}}_m \in \mathcal{N}_m^{\mathrm{int}}$ are the **intrinsic parameters** of sensor $m$ (e.g., material properties, geometry, fabrication-specific effects),
- $\nu^{\mathrm{ext}} \in \mathcal{N}^{\mathrm{ext}}$ are the **extrinsic parameters** (e.g., temperature, humidity, flow rate) that are shared across all sensors,
- $\epsilon_m$ is the measurement noise for sensor $m$.

The intrinsic parameters $\nu^{\mathrm{int}}_m$ may differ for each sensor, while the extrinsic parameters $\nu^{\mathrm{ext}}$ are common to all sensors.

#### 1.2 Stacked System

Stacking all sensor outputs, we define the total signal vector:

$$
\mathbf{s} = \begin{bmatrix} s_1 \\ \vdots \\ s_M \end{bmatrix} \in \mathbb{R}^D, \qquad D = \sum_{m=1}^M d_m
$$

and the forward model:

$$
\mathbf{s} = \mathbf{f}\left(c; \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}\right) + \boldsymbol{\epsilon}
$$

where:

- $\mathbf{f}: \mathbb{R}^K \times \mathcal{N}^{\mathrm{int}} \times \mathcal{N}^{\mathrm{ext}} \to \mathbb{R}^D$,
- $\nu^{\mathrm{int}} = (\nu^{\mathrm{int}}_1, \ldots, \nu^{\mathrm{int}}_M) \in \mathcal{N}^{\mathrm{int}}$,
- $\boldsymbol{\epsilon} = [\epsilon_1^\top, \ldots, \epsilon_M^\top]^\top$.

#### 1.3 Inverse Problem

**Given:**

- The observed sensor signals $\mathbf{s}$,
- Knowledge (or estimates) of the intrinsic parameters $\nu^{\mathrm{int}}$ and extrinsic parameters $\nu^{\mathrm{ext}}$,
- The forward model $\mathbf{f}$,

**Infer:**

- The VOC concentration vector $c \in \mathbb{R}^K$.

Formally, the inverse problem is to characterize (or estimate) the set:

$$
\mathcal{C}(\mathbf{s}; \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}) = \left\{ c \in \mathbb{R}^K \;\middle|\; \mathbf{s} = \mathbf{f}(c; \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}) + \boldsymbol{\epsilon} \right\}
$$

or, in the presence of noise, to find a (possibly probabilistic) estimate of $c$ given $\mathbf{s}$, $\nu^{\mathrm{int}}$, and $\nu^{\mathrm{ext}}$.

#### 1.4 Remarks

- **Nonlinearity:** No linearity or additivity is assumed for $f_m$ or $\mathbf{f}$; the mapping can be arbitrarily complex.
- **Parameterization:** The parameters $\nu$ are separated into intrinsic (sensor-specific) and extrinsic (shared) components, reflecting physical and environmental factors.
- **Dimensionality:** The signal $s_m$ for each sensor can be multidimensional ($d_m \geq 1$), and the concentration vector $c$ can represent any number of VOC species ($K \geq 1$).
- **Sensor Heterogeneity:** Each sensor may have a different response function $f_m$ and different intrinsic parameters.
- **Generalization:** This formulation encompasses cross-sensitivity, nonlinearities, and environmental dependencies, and is suitable for both deterministic and probabilistic (Bayesian) inference approaches.

This general mathematical framework provides a foundation for rigorous analysis and solution of the sensor fusion inverse problem in MOS sensor arrays, without restrictive assumptions on linearity or parameter coupling.

---

### 2. Linear-Gaussian Sensor Model: 1D Projection with Intrinsic and Extrinsic Parameters (Probabilistic Formulation)

Building on the **general nonlinear sensor fusion framework** above, we now consider a **simplified linear and probabilistic version** that explicitly incorporates both **intrinsic** and **extrinsic** parameters. This model is particularly relevant when each sensor's output is approximately a linear projection of the VOC concentration vector, and both the sensor response and noise are Gaussian, but the response also depends on sensor-specific (intrinsic) and shared (extrinsic) parameters.

#### 2.1 Connection to the General Model

- In the general model, the sensor response $f_m(c; \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}})$ can be arbitrary and nonlinear, with explicit dependence on both intrinsic and extrinsic parameters.
- Here, we **specialize** to the case where each sensor's response is a **linear projection** of $c$, but the projection vectors and noise characteristics are functions of both intrinsic and extrinsic parameters.
- This linear-Gaussian model with parameter dependence is a tractable and interpretable special case, useful for analysis and as a building block for more complex models.

#### 2.2 Linear-Gaussian Model for a Single Sensor (with Parameters)

- Let $c \in \mathbb{R}^K$ be the VOC concentration vector.
- Let $\nu^{\mathrm{int}}$ denote the **intrinsic parameters** (e.g., sensor-specific calibration, aging, fabrication variability).
- Let $\nu^{\mathrm{ext}}$ denote the **extrinsic parameters** (e.g., temperature, humidity, environmental conditions).
- Each sensor output $s$ is modeled as a **noisy linear projection**:

  $$
  s = b(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})^\top c + \eta, \qquad \eta \sim \mathcal{N}\left(0,\, [a(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})^\top c]^2 + \sigma^2(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})\right)
  $$

  where:
  - $b(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}}) \in \mathbb{R}^K$ is the **mean projection vector**, parameterized by both intrinsic and extrinsic factors,
  - $a(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}}) \in \mathbb{R}^K$ is the **standard deviation projection vector**, also parameterized,
  - $\sigma^2(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})$ is the additive measurement noise variance, possibly dependent on these parameters.

- **Probabilistic interpretation:**

  $$
  s \mid c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}} \sim \mathcal{N}\left(b(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})^\top c,\; [a(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})^\top c]^2 + \sigma^2(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})\right)
  $$

- **Priors:**
  - $b(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})$ and $a(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})$ may be modeled as random variables with priors $p(b \mid \nu^{\mathrm{int}}, \nu^{\mathrm{ext}})$ and $p(a \mid \nu^{\mathrm{int}}, \nu^{\mathrm{ext}})$, reflecting uncertainty or variability due to these parameters.
  - $\nu^{\mathrm{int}}$ and $\nu^{\mathrm{ext}}$ themselves may have priors if not known exactly.
  - $c$ may have a prior $p(c)$ (e.g., $c \sim \mathcal{N}(\mu_0, \Lambda_0)$).

#### 2.3 Inference Objective

The **ultimate goal** is to infer the posterior distribution of $c$ given the observed sensor output $s$ and known (or sampled) parameters $a$, $b$, $\nu^{\mathrm{int}}$, and $\nu^{\mathrm{ext}}$:

$$
p(c \mid s, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}) \propto p(s \mid c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}})\, p(c)
$$

where:

- $p(s \mid c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}})$ is the likelihood as above,
- $p(c)$ is the prior on $c$.

If $\nu^{\mathrm{int}}$ and/or $\nu^{\mathrm{ext}}$ are uncertain, the full posterior marginalizes over their possible values:

$$
p(c \mid s) = \iint p(c \mid s, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}})\, p(\nu^{\mathrm{int}})\, p(\nu^{\mathrm{ext}})\, d\nu^{\mathrm{int}}\, d\nu^{\mathrm{ext}}
$$

#### 2.4 Extension to Multiple Sensors

For $M$ independent sensors, each with its own intrinsic parameters $\nu^{\mathrm{int}}_m$ (and possibly shared or sensor-specific extrinsic parameters $\nu^{\mathrm{ext}}_m$):

$$
s_m \mid c, \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m \sim \mathcal{N}\left(b_m(\nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m)^\top c,\; [a_m(\nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m)^\top c]^2 + \sigma_m^2(\nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m)\right)
$$

and the joint likelihood is:

$$
p(\mathbf{s} \mid c, \{\nu^{\mathrm{int}}_m\}, \{\nu^{\mathrm{ext}}_m\}) = \prod_{m=1}^M \mathcal{N}\left(s_m;\; b_m(\nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m)^\top c,\; [a_m(\nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m)^\top c]^2 + \sigma_m^2(\nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m)\right)
$$

The posterior is then:

$$
p(c \mid \{\nu^{\mathrm{int}}_m\}, \{\nu^{\mathrm{ext}}_m\}, \mathbf{s}) \propto p(\mathbf{s} \mid c, \{\nu^{\mathrm{int}}_m\}, \{\nu^{\mathrm{ext}}_m\})\, p(c)
$$

If the parameters are uncertain, marginalization over their distributions is required.

#### 2.5 Interpretation

- $b_m(\nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m)$ encodes the **mean projection** from $c$ to the expected sensor output for sensor $m$, as determined by both intrinsic and extrinsic factors.
- $a_m(\nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m)$ encodes the **standard deviation** (uncertainty or variability) in the projection for sensor $m$, also parameterized.
- Both $a_m$ and $b_m$ are treated as functions of (or samples from) their respective parameter distributions, reflecting sensor heterogeneity, environmental effects, and uncertainty.
- The model captures both measurement noise and heteroscedastic sensor uncertainty, with variance depending on $c$ and the parameters.

---

**Summary:**  
In this framework, the **inverse problem** is to estimate $c$ from $\mathbf{s}$ by maximizing the posterior $p(c \mid \mathbf{s}, \nu)$, where $\nu$ denotes all intrinsic and extrinsic parameters. This MAP approach is appropriate when we lack a strong prior for $c$ and want to focus on the information provided by the sensor signals and the forward model. The solution $\hat{c}_{\mathrm{MAP}}$ is the most probable concentration vector given the observed data and known (or estimated) parameters, and is the central object of inference in practical sensor fusion.

---

### 3 Neural Network Parameterization of Mean and Standard Deviation

Extending the Section 2 framework, we generalize the linear-Gaussian sensor model by **replacing the linear functions $b(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})^\top c$ (mean) and $a(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})^\top c$ (standard deviation)** with neural network parameterizations. This allows the model to capture complex, nonlinear dependencies between the VOC concentration vector $c$, the sensor outputs, and both intrinsic and extrinsic sensor parameters.

- **Neural network for mean:**  
  In Section 2, the mean sensor response is $b(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})^\top c$, where $b$ is a function of intrinsic and extrinsic parameters. We now use a neural network $f_\mu$ that takes as input both $c$ and the sensor's intrinsic and extrinsic parameters:

  $$
  \mu(c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}) = f_\mu(c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}; \phi_\mu)
  $$

  where $f_\mu$ is a neural network with parameters $\phi_\mu$.

- **Neural network for standard deviation:**  
  Similarly, the standard deviation in Section 2 is $a(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})^\top c$. We now use a neural network $f_\sigma$:

  $$
  \sigma(c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}) = \text{softplus}(f_\sigma(c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}; \phi_\sigma))
  $$

  where $f_\sigma$ is a neural network with parameters $\phi_\sigma$, and $\text{softplus}$ ensures positivity.

- **Probabilistic model:**  
  The generative model for a single sensor output $s$ becomes:

  $$
  s \mid c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}} \sim \mathcal{N}\left(\mu(c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}),\; \sigma^2(c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}) + \sigma^2_{\text{meas}}(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})\right)
  $$

  where $\sigma^2_{\text{meas}}(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})$ is the measurement noise variance, which may also depend on the sensor parameters.

- **Multiple sensors:**  
  For $M$ sensors, each with its own intrinsic and extrinsic parameters $(\nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m)$, the model becomes:

  $$
  s_m \mid c, \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m \sim \mathcal{N}\left(\mu_m(c, \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m),\; \sigma_m^2(c, \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m) + \sigma^2_{\text{meas},m}(\nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m)\right)
  $$

  where, for each sensor $m$,

  $$
  \mu_m(c, \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m) = f_{\mu}(c, \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m; \phi_{\mu})
  $$

  $$
  \sigma_m(c, \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m) = \text{softplus}(f_{\sigma}(c, \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m; \phi_{\sigma}))
  $$

  The neural networks $f_\mu$ and $f_\sigma$ can be shared across sensors, with sensor-specific parameters as inputs, or implemented as $M$ independent networks.

- **Inference:**  
  The posterior over $c$ given observed sensor outputs $\mathbf{s}$ and known (or sampled) sensor parameters is:

  $$
  p(c \mid \{\nu^{\mathrm{int}}_m\}, \{\nu^{\mathrm{ext}}_m\}, \mathbf{s}) \propto \left[ \prod_{m=1}^M \mathcal{N}\left(s_m;\; \mu_m(c, \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m),\; \sigma_m^2(c, \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m) + \sigma^2_{\text{meas},m}(\nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m)\right) \right] p(c)
  $$

  If the intrinsic and/or extrinsic parameters are uncertain, the full posterior marginalizes over their distributions, as in Section 2:

  $$
  p(c \mid \mathbf{s}) = \iint p(c \mid \{\nu^{\mathrm{int}}_m\}, \{\nu^{\mathrm{ext}}_m\}, \mathbf{s}) \prod_{m=1}^M p(\nu^{\mathrm{int}}_m) p(\nu^{\mathrm{ext}}_m) d\nu^{\mathrm{int}}_m d\nu^{\mathrm{ext}}_m
  $$

  As in Section 2, this posterior is generally intractable due to the nonlinear dependence of the mean and variance on $c$ and the sensor parameters, but can be approximated using variational inference, MCMC, or other approximate Bayesian methods.

**Summary:**  
This neural network parameterization is a direct extension of the Section 2 linear-Gaussian model, now explicitly incorporating both intrinsic and extrinsic sensor parameters as inputs to the mean and standard deviation networks. This enables the model to flexibly capture nonlinear sensor responses, heteroscedastic uncertainty, and sensor heterogeneity, while retaining the probabilistic sensor fusion structure of Section 2.

### 4 Bayesian Neural Network

Now let's think of it as a **Bayesian neural network**.

In the previous formulation, the neural networks $f_\mu$ and $f_\sigma$ have deterministic weights (parameters $\phi_\mu$, $\phi_\sigma$). In a Bayesian neural network (BNN), we instead place probability distributions (priors) over these weights and infer their posterior given the data. This allows the model to capture _epistemic uncertainty_—uncertainty due to limited data or model capacity—in addition to the _aleatoric uncertainty_ already modeled by $\sigma$.

- **BNN parameterization:**  
  Let $f_\mu(\cdot; \phi_\mu)$ and $f_\sigma(\cdot; \phi_\sigma)$ now be Bayesian neural networks, with weight priors $p(\phi_\mu)$ and $p(\phi_\sigma)$. The generative model for a single sensor output $s$ becomes:

  $$
  \begin{align*}
    \phi_\mu &\sim p(\phi_\mu) \\
    \phi_\sigma &\sim p(\phi_\sigma) \\
    s \mid c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}, \phi_\mu, \phi_\sigma &\sim \mathcal{N}\left(\mu(c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}; \phi_\mu),\; \sigma^2(c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}; \phi_\sigma) + \sigma^2_{\text{meas}}(\nu^{\mathrm{int}}, \nu^{\mathrm{ext}})\right)
  \end{align*}
  $$

  where

  $$
  \mu(c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}; \phi_\mu) = f_\mu(c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}; \phi_\mu)
  $$

  $$
  \sigma(c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}; \phi_\sigma) = \text{softplus}(f_\sigma(c, \nu^{\mathrm{int}}, \nu^{\mathrm{ext}}; \phi_\sigma))
  $$

- **Posterior inference:**  
  The full Bayesian posterior over $c$ and the network weights is:

  $$
  p(c, \phi_\mu, \phi_\sigma \mid \mathbf{s}, \{\nu^{\mathrm{int}}_m\}, \{\nu^{\mathrm{ext}}_m\}) \propto p(\phi_\mu) p(\phi_\sigma) p(c) \prod_{m=1}^M \mathcal{N}\left(s_m;\; \mu_m(c, \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m; \phi_\mu),\; \sigma_m^2(c, \nu^{\mathrm{int}}_m, \nu^{\mathrm{ext}}_m; \phi_\sigma) + \sigma^2_{\text{meas},m}\right)
  $$

  The marginal posterior over $c$ is obtained by integrating out the network weights:

  $$
  p(c \mid \mathbf{s}, \{\nu^{\mathrm{int}}_m\}, \{\nu^{\mathrm{ext}}_m\}) = \iint p(c, \phi_\mu, \phi_\sigma \mid \mathbf{s}, \{\nu^{\mathrm{int}}_m\}, \{\nu^{\mathrm{ext}}_m\})\, d\phi_\mu\, d\phi_\sigma
  $$

  In practice, this is intractable and is typically approximated using variational inference (e.g., Bayes by Backprop), Monte Carlo dropout, or MCMC methods.

- **Interpretation:**
  - The BNN captures both _aleatoric_ (data) and _epistemic_ (model) uncertainty.
  - At test time, predictions are made by marginalizing over the posterior of the network weights, e.g., by averaging predictions from multiple weight samples.
  - This is especially valuable in sensor fusion, where uncertainty in the learned sensor models can be significant due to limited calibration data or distribution shift.

**Summary:**  
By making $f_\mu$ and $f_\sigma$ Bayesian neural networks, the sensor fusion model becomes fully probabilistic, quantifying uncertainty in both the sensor parameters and the learned sensor models themselves. This leads to more robust and calibrated uncertainty estimates in downstream inference and decision-making.

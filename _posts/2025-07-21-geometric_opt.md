---
layout: post
title: PDE-Constrained Optimization for Array/Geometry Optimization
date: 2025-07-21 12:00:00
hidden: true
description: Application of neural operator in PDE-constrained optimization
tags: [optimization, neural operator]
categories: [optimization, neural operator]
---

## Reaction-Diffusion-Advection PDE for E-Nose Simulation with MOS Sensor (with Temperature Effects)

In electronic nose (e-nose) systems using Metal-Oxide Semiconductor (MOS) gas sensor arrays, the spatiotemporal evolution of gas concentration in the sensing chamber is modeled by the **reaction-diffusion-advection** partial differential equation (PDE). This model captures the combined effects of gas transport (advection and diffusion), interaction with the sensor array, and **temperature-dependent effects**.

### 1. Physical Model

Let $c(\mathbf{x}, t)$ denote the gas concentration at position $\mathbf{x}$ and time $t$, and $T(\mathbf{x}, t)$ the temperature field. The governing PDE is:

$$
\frac{\partial c}{\partial t} + \nabla \cdot (\mathbf{u} c) = \nabla \cdot \left( D(T) \nabla c \right) - R(c, T, \mathbf{x}, t)
$$

where:
- $\mathbf{u}(\mathbf{x})$ is the **advection velocity field** (e.g., airflow),
- $D(T)$ is the **diffusion coefficient**, now a function of temperature,
- $R(c, T, \mathbf{x}, t)$ is the **reaction term** representing gas uptake at the MOS sensor sites, also temperature-dependent.

#### **Temperature-Dependent Diffusion**

The diffusion coefficient $D$ typically increases with temperature, e.g.,

$$
D(T) = D_0 \left( \frac{T}{T_0} \right)^\alpha
$$

where $D_0$ is the reference diffusion coefficient at temperature $T_0$, and $\alpha$ is a material-dependent exponent (often $\alpha \approx 1.5$ for gases).

#### **Reaction Term: Fick's Law, Dirac Delta Array, and Temperature Dependence**

For MOS sensor arrays, the reaction (gas consumption) is highly localized at the sensor sites. The reaction rate constant $k_i$ is temperature-dependent, and its temperature dependence is often modeled using an **Arrhenius law**:

$$
k_i(T) = k_{i,0} \exp\left(-\frac{E_{a,i}}{k_B T(\mathbf{x}_i, t)}\right)
$$

where:
- $k_{i,0}$ is the pre-exponential factor for sensor $i$,
- $E_{a,i}$ is the activation energy,
- $k_B$ is the Boltzmann constant,
- $T(\mathbf{x}_i, t)$ is the temperature at sensor $i$.

This **Arrhenius form** arises from the Boltzmann distribution, which describes the probability of molecules having sufficient energy to react. Thus, the reaction rate increases exponentially with temperature, as more molecules have enough energy to overcome the activation barrier.

The reaction term is then:

$$
R(c, T, \mathbf{x}, t) = \sum_{i=1}^N k_i(T) \, c(\mathbf{x}, t) \, \delta(\mathbf{x} - \mathbf{x}_i)
$$

where:
- $N$ is the number of sensors,
- $\delta(\mathbf{x} - \mathbf{x}_i)$ is the Dirac delta function centered at the location $\mathbf{x}_i$ of sensor $i$.

**Note:** The Arrhenius law is a direct consequence of the Boltzmann distribution of molecular energies, so the reaction rate's temperature dependence is fundamentally governed by Boltzmann statistics.

### 2. Temperature Field

- The temperature field $T(\mathbf{x}, t)$ can be prescribed (e.g., uniform, or with local heating at sensor sites), or modeled with its own PDE if heat transfer is significant.
- In many e-nose systems, MOS sensors are actively heated, so $T$ may vary spatially and temporally.

### 3. Boundary and Initial Conditions

Let $\Omega$ denote the spatial domain (e.g., the chamber), and $\partial\Omega$ its boundary.

- **Inlet boundary ($\Gamma_\text{in}$):**
  - Prescribed gas concentration: $c(\mathbf{x}, t) = c_\text{in}(t)$ for $\mathbf{x} \in \Gamma_\text{in}$
  - Prescribed temperature: $T(\mathbf{x}, t) = T_\text{in}(t)$ for $\mathbf{x} \in \Gamma_\text{in}$
- **Outlet boundary ($\Gamma_\text{out}$):**
  - Convective (outflow) or zero diffusive flux: $(-D(T)\nabla c + \mathbf{u}c)\cdot \mathbf{n} = 0$ for $\mathbf{x} \in \Gamma_\text{out}$
  - Temperature: insulated or prescribed, e.g., $\nabla T \cdot \mathbf{n} = 0$ or $T(\mathbf{x}, t) = T_\text{out}(t)$
- **Walls ($\Gamma_\text{wall}$):**
  - No-flux: $\nabla c \cdot \mathbf{n} = 0$ for $\mathbf{x} \in \Gamma_\text{wall}$
  - Insulated: $\nabla T \cdot \mathbf{n} = 0$ for $\mathbf{x} \in \Gamma_\text{wall}$
- **Initial condition:**
  - $c(\mathbf{x}, 0) = c_0(\mathbf{x})$ for $\mathbf{x} \in \Omega$
  - $T(\mathbf{x}, 0) = T_0(\mathbf{x})$ for $\mathbf{x} \in \Omega$

### 4. Numerical Simulation

- The PDE is discretized in space and time.
- The Dirac delta reaction terms are implemented as strong sinks at the grid points corresponding to sensor locations.
- The geometry and placement of the sensor array are encoded in the positions $\{\mathbf{x}_i\}$.
- Temperature dependence is included in both diffusion and reaction terms.

### 5. Application to Geometry/Array Optimization

- The **objective** is to optimize sensor placement, chamber geometry, or temperature profiles for improved detection, selectivity, or response time, often by shaping the concentration field $c(\mathbf{x}, t)$.
- The **PDE-constrained optimization** problem is:
  $$
  \min_{\{\mathbf{x}_i\}, \text{geometry}, T(\cdot)} \; \mathcal{L}(c(\mathbf{x}, t); \text{target})
  $$
  subject to the temperature-dependent reaction-diffusion-advection PDE with Dirac delta reaction terms.

---

## **PDE-Constrained Optimization Problem (Full Formulation)**

**Find:**  
- Sensor locations $\{\mathbf{x}_i\}_{i=1}^N$ (and/or geometry, and/or temperature profile $T(\mathbf{x}, t)$)

**to minimize:**  
- An objective functional, e.g.,
  $$
  \mathcal{L}(c) = \int_0^T \int_\Omega F(c(\mathbf{x}, t), \mathbf{x}, t) \, d\mathbf{x} \, dt
  $$
  where $F$ encodes the desired performance (e.g., maximizing sensitivity, minimizing detection time, maximizing spatial selectivity, etc.)

**subject to:**
- The reaction-diffusion-advection PDE:
  $$
  \frac{\partial c}{\partial t} + \nabla \cdot (\mathbf{u} c) = \nabla \cdot \left( D(T) \nabla c \right) - \sum_{i=1}^N k_i(T) \, c(\mathbf{x}, t) \, \delta(\mathbf{x} - \mathbf{x}_i)
  $$
  for $\mathbf{x} \in \Omega$, $t \in (0, T]$

- **Boundary conditions:**
  - $c(\mathbf{x}, t) = c_\text{in}(t)$ for $\mathbf{x} \in \Gamma_\text{in}$
  - $(-D(T)\nabla c + \mathbf{u}c)\cdot \mathbf{n} = 0$ for $\mathbf{x} \in \Gamma_\text{out}$
  - $\nabla c \cdot \mathbf{n} = 0$ for $\mathbf{x} \in \Gamma_\text{wall}$

  - $T(\mathbf{x}, t) = T_\text{in}(t)$ for $\mathbf{x} \in \Gamma_\text{in}$
  - (or) $\nabla T \cdot \mathbf{n} = 0$ for insulated boundaries

- **Initial conditions:**
  - $c(\mathbf{x}, 0) = c_0(\mathbf{x})$ for $\mathbf{x} \in \Omega$
  - $T(\mathbf{x}, 0) = T_0(\mathbf{x})$ for $\mathbf{x} \in \Omega$

- **Temperature dependence:**
  - $D(T)$ and $k_i(T)$ as above, with $k_i(T)$ following the Arrhenius (Boltzmann) law.

---

## **Feynman-Kac Theorem for Multidimensional SDEs**

The Feynman-Kac theorem provides a probabilistic representation of the solution to certain linear parabolic PDEs in terms of expectations over stochastic processes governed by SDEs. For the multidimensional case, consider the following:

### **Multidimensional Feynman-Kac Theorem (General Form)**

Let $u(\mathbf{x}, t)$ solve the PDE:
$$
\frac{\partial u}{\partial t} + \mathcal{L} u - V(\mathbf{x}, t) u = 0, \qquad u(\mathbf{x}, 0) = f(\mathbf{x})
$$
where $\mathcal{L}$ is the second-order differential operator:
$$
\mathcal{L} u = \sum_{i=1}^d b_i(\mathbf{x}, t) \frac{\partial u}{\partial x_i} + \frac{1}{2} \sum_{i,j=1}^d a_{ij}(\mathbf{x}, t) \frac{\partial^2 u}{\partial x_i \partial x_j}
$$
with $a = \sigma \sigma^\top$ (diffusion matrix), and $b$ the drift.

Let $\mathbf{X}_t$ be the solution to the multidimensional SDE:
$$
d\mathbf{X}_t = b(\mathbf{X}_t, t) dt + \sigma(\mathbf{X}_t, t) d\mathbf{W}_t, \qquad \mathbf{X}_0 = \mathbf{x}
$$
where $\mathbf{W}_t$ is a $d$-dimensional Wiener process.

**Then, the Feynman-Kac formula states:**
$$
u(\mathbf{x}, t) = \mathbb{E}^{\mathbf{X}_0 = \mathbf{x}} \left[ f(\mathbf{X}_t) \exp\left( -\int_0^t V(\mathbf{X}_s, s) ds \right) \right]
$$
where the expectation is over all realizations of the SDE starting at $\mathbf{x}$.

---

### **Application to the E-Nose Reaction-Diffusion-Advection PDE**

For our problem, the SDE is:
$$
d\mathbf{X}_t = \mathbf{u}(\mathbf{X}_t) dt + \sqrt{2 D(T(\mathbf{X}_t, t))} d\mathbf{W}_t
$$
and the "potential" (killing rate) is:
$$
V(\mathbf{x}, t) = \sum_{i=1}^N k_i(T) \, \delta(\mathbf{x} - \mathbf{x}_i)
$$

The solution to the PDE for $c(\mathbf{x}, t)$ with initial condition $c_0(\mathbf{x})$ is:
$$
c(\mathbf{x}, t) = \mathbb{E}^{\mathbf{X}_0 = \mathbf{x}} \left[ c_0(\mathbf{X}_t) \exp\left( - \int_0^t V(\mathbf{X}_s, s) ds \right) \right]
$$

- The exponential term accounts for the **probability of survival** (i.e., not being "killed" by the reaction at the sensor sites) along the stochastic path.
- The Dirac delta in $V$ means that the process is "killed" (i.e., the concentration is depleted) only when the path hits a sensor location, with a rate determined by $k_i(T)$.

---

### **SDE-Based Optimization Problem**

The **PDE-constrained optimization** can thus be equivalently formulated as an **SDE-constrained optimization**:

- **Find:** sensor locations $\{\mathbf{x}_i\}$, geometry, and/or temperature profile $T(\mathbf{x}, t)$
- **to minimize:**
  $$
  \mathcal{L} = \mathbb{E} \left[ \int_0^T F(\mathbf{X}_t, t, \text{path functionals}) \exp\left( - \int_0^t V(\mathbf{X}_s, s) ds \right) dt \right]
  $$
  where the expectation is over the stochastic process $\mathbf{X}_t$ governed by the SDE above, and $F$ encodes the desired performance.

- **subject to:** the SDE dynamics and the reaction (killing) term.

---

### **Approximating the Dirac Delta Potential with a Gaussian**

In practical numerical simulations, the Dirac delta function $\delta(\mathbf{x} - \mathbf{x}_i)$ is **approximated by a narrow Gaussian** centered at $\mathbf{x}_i$:

$$
\delta(\mathbf{x} - \mathbf{x}_i) \approx \frac{1}{(2\pi \epsilon^2)^{d/2}} \exp\left( -\frac{|\mathbf{x} - \mathbf{x}_i|^2}{2\epsilon^2} \right)
$$

where:
- $d$ is the spatial dimension,
- $\epsilon$ is a small parameter controlling the width of the Gaussian (chosen to be small compared to the sensor size or grid spacing).

Thus, the reaction term and the potential in the SDE/Feynman-Kac formulation become:

$$
R(c, T, \mathbf{x}, t) \approx \sum_{i=1}^N k_i(T) \, c(\mathbf{x}, t) \, \frac{1}{(2\pi \epsilon^2)^{d/2}} \exp\left( -\frac{|\mathbf{x} - \mathbf{x}_i|^2}{2\epsilon^2} \right)
$$

and

$$
V(\mathbf{x}, t) \approx \sum_{i=1}^N k_i(T) \, \frac{1}{(2\pi \epsilon^2)^{d/2}} \exp\left( -\frac{|\mathbf{x} - \mathbf{x}_i|^2}{2\epsilon^2} \right)
$$

This **Gaussian approximation** allows for efficient and stable numerical implementation, and models the physical reality that sensors have finite spatial extent.

---

**Summary:**  
- The reaction-diffusion-advection PDE for e-nose simulation with MOS sensors (including temperature effects and localized reactions) can be reformulated as an SDE using the multidimensional Feynman-Kac theorem.
- The Dirac delta potential representing sensor sites is approximated by a narrow Gaussian for numerical and physical realism.
- This stochastic representation provides a probabilistic interpretation of the concentration field and enables alternative simulation and optimization strategies, especially for complex geometries or when using Monte Carlo methods.

---












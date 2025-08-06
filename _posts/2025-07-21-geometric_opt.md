---
layout: post
title: PDE-Constrained Optimization for Geometry and Sensor Placement (Minimal Sensing)
date: 2025-07-21 12:00:00
hidden: true
description: Optimal geometry and sensor placement for maximal VOC information with minimal sensors
tags: [optimization, geometry, sensor placement, neural operator]
categories: [optimization, neural operator]
---

## Reaction-Diffusion-Advection PDE for E-Nose Simulation (Neglecting Sensor Reaction)

In electronic nose (e-nose) systems using Metal-Oxide Semiconductor (MOS) gas sensor arrays, the spatiotemporal evolution of gas concentration in the sensing chamber is governed by the **reaction-diffusion-advection** partial differential equation (PDE). However, in many practical cases, the amount of analyte consumed by the sensors is negligible compared to the total VOC present. Therefore, for the purpose of optimal geometry and sensor placement, we **ignore the reaction term** due to the sensors.

### 1. Physical Model (No Sensor Reaction)

Let $c(\mathbf{x}, t)$ denote the gas concentration at position $\mathbf{x}$ and time $t$, and $T(\mathbf{x}, t)$ the temperature field. The governing PDE is:

$$
\frac{\partial c}{\partial t} + \nabla \cdot (\mathbf{u} c) = \nabla \cdot \left( D(T) \nabla c \right)
$$

where:
- $\mathbf{u}(\mathbf{x})$ is the **advection velocity field** (e.g., airflow),
- $D(T)$ is the **diffusion coefficient**, which may depend on temperature.

#### **Temperature-Dependent Diffusion**

The diffusion coefficient $D$ typically increases with temperature, e.g.,

$$
D(T) = D_0 \left( \frac{T}{T_0} \right)^\alpha
$$

where $D_0$ is the reference diffusion coefficient at temperature $T_0$, and $\alpha$ is a material-dependent exponent (often $\alpha \approx 1.5$ for gases).

### 2. Quantifying and Optimizing Geometry

The geometry of the sensing chamber plays a crucial role in shaping the concentration field and, consequently, the information available to the sensors. In the optimization framework, the geometry can be parameterized in various ways. **One flexible and powerful approach is to use splines** (e.g., B-splines or cubic splines) to represent the boundaries or internal features of the chamber.

- **Spline-based geometry parameterization:**  
  The boundary of the chamber (or internal baffles, flow guides, etc.) can be described by a set of control points. The positions of these control points define a spline curve (in 2D) or surface (in 3D), which in turn defines the shape of the domain $\Omega$.
- **Optimization variables:**  
  The spline control points become part of the optimization variables, allowing for smooth, flexible, and low-dimensional control over complex geometries.

This approach enables the optimization process to explore a wide range of possible chamber shapes, from simple rectangles to highly nontrivial, smoothly varying boundaries, all while keeping the parameter space manageable.

### 3. Boundary and Initial Conditions

Let $\Omega$ denote the spatial domain (e.g., the chamber, possibly defined by a spline), and $\partial\Omega$ its boundary.

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
- The geometry is encoded via the spline control points, which define the computational domain.
- Sensor locations $\{\mathbf{x}_i\}$ are chosen within $\Omega$ and do **not** affect the PDE solution (since sensors do not consume analyte).
- Temperature dependence is included in the diffusion term.

### 5. Application to Geometry and Sensor Placement Optimization

The **goal** is to find an optimal chamber geometry (parameterized, for example, by spline control points) and a minimal set of sensor locations that together maximize the information captured about the VOC (volatile organic compound) field, while minimizing the number of sensors.

#### **Optimization Problem Statement**

- **Find:**  
  - Chamber geometry (e.g., spline control points defining the boundary)
  - Sensor locations $\{\mathbf{x}_i\}_{i=1}^N$ (with $N$ as small as possible)

- **to minimize:**  
  - The number of sensors $N$
  - **while maximizing** the information captured about the VOC field (e.g., maximizing coverage, minimizing uncertainty, maximizing mutual information, or maximizing the ability to reconstruct $c(\mathbf{x}, t)$ from sensor readings)

- **subject to:**  
  - The reaction-diffusion-advection PDE (without reaction term):
    $$
    \frac{\partial c}{\partial t} + \nabla \cdot (\mathbf{u} c) = \nabla \cdot \left( D(T) \nabla c \right)
    $$
    for $\mathbf{x} \in \Omega$, $t \in (0, T]$
  - Boundary and initial conditions as above, with $\Omega$ defined by the current spline geometry.

#### **Objective Functional Example**

A typical objective functional for this problem could be:

$$
\mathcal{L}(\{\mathbf{x}_i\}, \text{spline geometry}) = \text{ReconstructionError}(c(\mathbf{x}, t) \mid \{c(\mathbf{x}_i, t)\}_{i=1}^N) + \lambda N
$$

where:
- $\text{ReconstructionError}$ quantifies how well the full concentration field can be inferred from the sensor readings,
- $\lambda$ is a regularization parameter penalizing the number of sensors.

Alternatively, one may maximize the mutual information between the sensor readings and the full field, or use other information-theoretic or task-specific criteria.

---

## **Feynman-Kac Theorem for the Linear PDE (No Reaction Term)**

The Feynman-Kac theorem provides a probabilistic representation of the solution to certain linear parabolic PDEs. In the absence of a reaction (killing) term, the solution to

$$
\frac{\partial u}{\partial t} + \mathcal{L} u = 0, \qquad u(\mathbf{x}, 0) = f(\mathbf{x})
$$

where $\mathcal{L}$ is the second-order differential operator

$$
\mathcal{L} u = \sum_{i=1}^d b_i(\mathbf{x}, t) \frac{\partial u}{\partial x_i} + \frac{1}{2} \sum_{i,j=1}^d a_{ij}(\mathbf{x}, t) \frac{\partial^2 u}{\partial x_i \partial x_j}
$$

with $a = \sigma \sigma^\top$ (diffusion matrix), and $b$ the drift, is given by

$$
u(\mathbf{x}, t) = \mathbb{E}^{\mathbf{X}_0 = \mathbf{x}} \left[ f(\mathbf{X}_t) \right]
$$

where $\mathbf{X}_t$ is the solution to the SDE

$$
d\mathbf{X}_t = b(\mathbf{X}_t, t) dt + \sigma(\mathbf{X}_t, t) d\mathbf{W}_t, \qquad \mathbf{X}_0 = \mathbf{x}
$$

and $\mathbf{W}_t$ is a $d$-dimensional Wiener process.

---

### **Application to the E-Nose PDE (No Sensor Reaction)**

For our problem, the SDE is:

$$
d\mathbf{X}_t = \mathbf{u}(\mathbf{X}_t) dt + \sqrt{2 D(T(\mathbf{X}_t, t))} d\mathbf{W}_t
$$

and the solution to the PDE for $c(\mathbf{x}, t)$ with initial condition $c_0(\mathbf{x})$ is:

$$
c(\mathbf{x}, t) = \mathbb{E}^{\mathbf{X}_0 = \mathbf{x}} \left[ c_0(\mathbf{X}_t) \right]
$$

This stochastic representation provides a probabilistic interpretation of the concentration field, which can be useful for sensor placement strategies (e.g., maximizing the expected information gain from sensor locations).

---

## **Summary**

- The reaction-diffusion-advection PDE for e-nose simulation (with temperature effects) is considered **without a reaction term** due to negligible analyte consumption by sensors.
- The **optimization problem** is to find the optimal chamber geometry (which can be parameterized by splines) and minimal set of sensor locations that together maximize the information captured about the VOC field.
- The solution to the PDE can be interpreted probabilistically via the Feynman-Kac theorem (without a killing term).
- This framework enables principled design of sensor arrays and chamber geometries for maximal information capture with minimal hardware, and allows for flexible, spline-based geometry optimization.

---
---

### **Application to the E-Nose Advection-Diffusion PDE (No Reaction Term)**

Since we are **ignoring the reaction term** (i.e., analyte consumption by sensors is negligible), the evolution of the analyte concentration is governed by the advection-diffusion SDE:
$$
d\mathbf{X}_t = \mathbf{u}(\mathbf{X}_t) dt + \sqrt{2 D(T(\mathbf{X}_t, t))} d\mathbf{W}_t
$$

The solution to the PDE for $c(\mathbf{x}, t)$ with initial condition $c_0(\mathbf{x})$ is given by:
$$
c(\mathbf{x}, t) = \mathbb{E}^{\mathbf{X}_0 = \mathbf{x}} \left[ c_0(\mathbf{X}_t) \right]
$$

- There is **no reaction (killing) term** or Dirac delta potential, so the Feynman-Kac formula reduces to a simple expectation over SDE paths.
- The Gaussian approximation of the Dirac delta is **not needed** in this setting.

---

### **Optimization and Operator Learning Surrogate**

The **geometry and sensor placement optimization** problem can be formulated as:

- **Find:** sensor locations $\{\mathbf{x}_i\}$, chamber geometry, and/or temperature profile $T(\mathbf{x}, t)$
- **to optimize:**
  $$
  \mathcal{L} = \mathbb{E} \left[ \int_0^T F(\mathbf{X}_t, t, \text{path functionals}) \, dt \right]
  $$
  where $F$ encodes the desired performance or information metric, and the expectation is over the SDE paths.

- **subject to:** the advection-diffusion SDE dynamics above.

---

### **Operator Learning for Surrogate Modeling**

To efficiently optimize over geometry and sensor configurations, we can use **operator learning** to build a surrogate model for the PDE solution or relevant functionals:

- **Data Generation:** Simulate the advection-diffusion PDE (or SDE) for a range of geometries, boundary conditions, and sensor placements to generate training data.
- **Neural Operator Training:** Train a neural operator (e.g., DeepONet, Fourier Neural Operator) to learn the mapping:
  $$
  \mathcal{G}_\theta: (\text{geometry}, c_0, T, \{\mathbf{x}_i\}) \mapsto c(\mathbf{x}, t)
  $$
  or directly to sensor outputs or information metrics.
- **Surrogate-Based Optimization:** Use the trained operator as a fast surrogate to evaluate the objective $\mathcal{L}$ for new geometry and sensor configurations, enabling efficient optimization.

This approach removes the need for repeated expensive PDE solves during optimization, greatly accelerating the design process.
---

### **Supervised Operator Learning with Feynman-Kac Labels and Geometry Optimization**

In the **supervised learning** setting, we use the Feynman-Kac formula to generate ground-truth labels for training the neural operator surrogate, and then leverage this surrogate to optimize the chamber geometry and sensor placement.

- **Label Generation:** For each training example (geometry, initial condition, temperature, sensor placement), compute the reference solution $c(\mathbf{x}, t)$ using the Feynman-Kac expectation:
  $$
  c_{\text{label}}(\mathbf{x}, t) = \mathbb{E}^{\mathbf{X}_0 = \mathbf{x}} \left[ c_0(\mathbf{X}_t) \right]
  $$
  This is typically estimated via Monte Carlo simulation of the SDE.

- **Supervised Loss:** The neural operator $\mathcal{G}_\theta$ is trained to minimize the discrepancy between its prediction and the Feynman-Kac label:
  $$
  \mathcal{L}_{\text{sup}} = \mathbb{E}_{\text{data}} \left[ \| \mathcal{G}_\theta(\text{input}) - c_{\text{label}} \|^2 \right]
  $$
  where the input includes geometry, $c_0$, $T$, and sensor locations.

- **Ultimate Objective — Geometry Optimization:**  
  Once the neural operator surrogate is trained, we use it to efficiently evaluate the design objective $\mathcal{L}$ (e.g., information gain, detection accuracy) as a function of geometry and sensor placement:
  $$
  \mathcal{L}(\text{geometry}, \{\mathbf{x}_i\}) = \mathbb{E} \left[ \int_0^T F(\mathbf{X}_t, t, \text{path functionals}) \, dt \right]
  $$
  The surrogate $\mathcal{G}_\theta$ enables rapid evaluation of $c(\mathbf{x}, t)$ or sensor outputs for new candidate geometries, allowing for efficient optimization (e.g., via gradient-based or evolutionary algorithms) to find the optimal shape and sensor configuration.

**Summary of Workflow:**
1. **Generate training data** using Feynman-Kac as the ground-truth label.
2. **Train the neural operator** with supervised loss to match Feynman-Kac solutions.
3. **Use the trained operator** as a surrogate to rapidly optimize geometry and sensor placement for the ultimate design objective.

---


---

**Summary:**  
- The e-nose chamber design problem is considered **without reaction terms**, so the analyte field evolves by advection and diffusion only.
- The Feynman-Kac representation simplifies, and there is **no need for Dirac delta or Gaussian approximations**.
- **Operator learning** enables rapid surrogate modeling of the PDE solution, supporting efficient geometry and sensor placement optimization for maximal information capt
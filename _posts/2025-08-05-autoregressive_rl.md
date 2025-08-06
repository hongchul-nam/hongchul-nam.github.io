---
layout: post
title: Autoregressive RL model
date: 2025-08-05 12:00:00
hidden: true
description: Summary of RL
tags: [Generative Model, Flow Matching, RL]
categories: [generative]
---


## Mathematical Formulation of Forward, Inverse Dynamics, and Rewards in Autoregressive RL (Non-Markovian Setting)

In the **non-Markovian** setting, the next state, action, and reward may depend on the entire history, not just the current state and action. In **autoregressive RL**, the *sequence* of actions and states is modeled as an autoregressive process over time (not over state dimensions).

Let us define:

- **History up to time t:**  
  $h_t = (s_0, a_0, r_0, s_1, a_1, r_1, ..., s_t)$
- **State space:** $\mathcal{S}$  
- **Action space:** $\mathcal{A}$  
- **Reward space:** $\mathcal{R}$  

---

### 1. Forward Dynamics (Autoregressive in Time, Non-Markovian)

The **forward dynamics** model predicts the next state $s_{t+1}$ and reward $r_t$ given the full history $h_t$ and the next action $a_t$:

- **Forward model:**  
  $P(s_{t+1} | h_t, a_t)$  
  $P(r_t | h_t, a_t, s_{t+1})$

That is, the next state is generated conditioned on the full history and the action, and the reward is generated conditioned on the full history, action, and resulting next state.

---

### 2. Inverse Dynamics (Autoregressive in Time, Non-Markovian)

The **inverse dynamics** model predicts the action *a_t* that caused the transition from $h_t$ to $s_{t+1}$:

- **Inverse model:**  
  $P(a_t | h_t, s_{t+1})$

This can be used, for example, in imitation learning or for inferring actions from observed transitions.

---

### 3. Reward Model (Autoregressive in Time, Non-Markovian)

The **reward model** predicts the reward $r_t$ given the full history, the current action, and the next state:

- **Reward model:**  
  $P(r_t | h_t, a_t, s_{t+1})$

---

### **Summary Table**

| Model Type         | Non-Markovian Formulation |
| ------------------ | ---------------------------- |
| Forward Dynamics   | $P(s_{t+1} \| a_t, h_t)$ |
| Inverse Dynamics   | $P(a_t \| s_{t+1}, h_{t})$ |
| Reward Model       | $P(r_t \| s_{t+1}, a_t, h_t)$| 

---

**Notes:**  
- In the non-Markovian, autoregressive RL setting, the model conditions on the entire history $h_t$ at each time step, not just the current state.
- The autoregressive property refers to the *temporal* sequence: each element (action, state, reward) is generated conditioned on the full preceding history.
- In practice, $h_t$ is often encoded using recurrent neural networks or transformers to summarize the history efficiently.
- This approach allows the dynamics and reward models to capture long-term dependencies and partial observability, which are not possible in Markovian models.

**Full trajectory factorization (autoregressive in time):**

$P(\tau) = P(s_0) × \Pi_t [P(a_t | h_t) × P(s_{t+1} | h_t, a_t) × P(r_t | h_t, a_t, s_{t+1})]$

where $h_t = (s_0, a_0, r_0, ..., s_t)$
and each conditional is over the *entire* history up to that point.










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

### **Classifier-Free Guidance for Joint Forward/Inverse Dynamics**

We can use **classifier-free guidance** (CFG) to steer the joint model $p(a_t, s_{t+1} \mid h_t)$ toward either the forward or inverse dynamics, by interpolating between the unconditional and conditional log-probabilities.

Let $v(a_t, s_{t+1} \mid h_t)$ be the vector field (e.g., the score or velocity in flow matching) parameterizing the joint distribution.

#### **Log-Probability Formulation with Null Tokens**

Recall our null token notation:
- $\varnothing^A$: null token for action (means "no action specified")
- $\varnothing^S$: null token for state (means "no state specified")

We define:
- **Unconditional log-probability:** $\log p(a_t, s_{t+1} \mid h_t)$
- **Marginal log-probabilities:**
  - $\log p(a_t, \varnothing^S \mid h_t)$ (marginalize $s_{t+1}$)
  - $\log p(\varnothing^A, s_{t+1} \mid h_t)$ (marginalize $a_t$)

#### **Classifier-Free Guidance for Forward and Inverse Dynamics**

- **Forward dynamics (sample $s_{t+1}$ given $a_t$):**
  - The conditional log-probability:
    $$
    \log p(s_{t+1} \mid a_t, h_t) = \log p(a_t, s_{t+1} \mid h_t) - \log p(a_t, \varnothing^S \mid h_t)
    $$
  - **CFG version:**
    $$
    \log p_{\text{CFG}}(a_t, s_{t+1} \mid h_t) = \log p(a_t, s_{t+1} \mid h_t) + w \left[ \log p(a_t, s_{t+1} \mid h_t) - \log p(a_t, \varnothing^S \mid h_t) \right]
    $$
    where $w$ is the guidance scale.

- **Inverse dynamics (sample $a_t$ given $s_{t+1}$):**
  - The conditional log-probability:
    $$
    \log p(a_t \mid s_{t+1}, h_t) = \log p(a_t, s_{t+1} \mid h_t) - \log p(\varnothing^A, s_{t+1} \mid h_t)
    $$
  - **CFG version:**
    $$
    \log p_{\text{CFG}}(a_t, s_{t+1} \mid h_t) = \log p(a_t, s_{t+1} \mid h_t) + w \left[ \log p(a_t, s_{t+1} \mid h_t) - \log p(\varnothing^A, s_{t+1} \mid h_t) \right]
    $$

#### **Gradient Formulation (for Flow Matching or Score-Based Models)**

In flow matching or score-based models, we work with gradients of the log-probability (the score):

- **Score for joint:** $\nabla_{a_t, s_{t+1}} \log p(a_t, s_{t+1} \mid h_t)$
- **Score for marginal:** e.g., $\nabla_{a_t} \log p(a_t, \varnothing^S \mid h_t)$

**Classifier-free guidance score for forward dynamics:**
$$
\nabla_{s_{t+1}} \log p_{\text{CFG}}(a_t, s_{t+1} \mid h_t) = \nabla_{s_{t+1}} \log p(a_t, s_{t+1} \mid h_t) + w \left[ \nabla_{s_{t+1}} \log p(a_t, s_{t+1} \mid h_t) - \nabla_{s_{t+1}} \log p(a_t, \varnothing^S \mid h_t) \right]
$$

**Classifier-free guidance score for inverse dynamics:**
$$
\nabla_{a_t} \log p_{\text{CFG}}(a_t, s_{t+1} \mid h_t) = \nabla_{a_t} \log p(a_t, s_{t+1} \mid h_t) + w \left[ \nabla_{a_t} \log p(a_t, s_{t+1} \mid h_t) - \nabla_{a_t} \log p(\varnothing^A, s_{t+1} \mid h_t) \right]
$$

---

### **Incorporating Q-Learning into the Unified Model**

We can further extend this unified framework to include **Q-learning** by relating the joint model $p(a_t, s_{t+1} \mid h_t)$ to the Q-function.

Recall the Q-function:
$$
Q(h_t, a_t) = \mathbb{E}_{s_{t+1}, r_t} \left[ r_t + \gamma \max_{a'} Q(h_{t+1}, a') \mid h_t, a_t \right]
$$

#### **Q-Function as an Energy or Guidance Term**

- The Q-function can be interpreted as an **energy** or **reward-to-go** associated with $(h_t, a_t)$.
- We can use the Q-function to **guide** the sampling of actions (and possibly next states) by modifying the joint distribution:
  $$
  p_{\text{Q}}(a_t, s_{t+1} \mid h_t) \propto p(a_t, s_{t+1} \mid h_t) \cdot \exp(\beta Q(h_t, a_t))
  $$
  where $\beta$ is a temperature or guidance scale.

- In log-probability space:
  $$
  \log p_{\text{Q}}(a_t, s_{t+1} \mid h_t) = \log p(a_t, s_{t+1} \mid h_t) + \beta Q(h_t, a_t)
  $$

- In **gradient (score) space** (for flow matching or diffusion):
  $$
  \nabla_{a_t} \log p_{\text{Q}}(a_t, s_{t+1} \mid h_t) = \nabla_{a_t} \log p(a_t, s_{t+1} \mid h_t) + \beta \nabla_{a_t} Q(h_t, a_t)
  $$

#### **Combining Classifier-Free Guidance and Q-Learning**

We can combine both forms of guidance:
$$
\log p_{\text{CFG+Q}}(a_t, s_{t+1} \mid h_t) = \log p(a_t, s_{t+1} \mid h_t) + w \left[ \log p(a_t, s_{t+1} \mid h_t) - \log p(\varnothing^A, s_{t+1} \mid h_t) \right] + \beta Q(h_t, a_t)
$$

And the corresponding gradient:
$$
\nabla_{a_t} \log p_{\text{CFG+Q}}(a_t, s_{t+1} \mid h_t) = \nabla_{a_t} \log p(a_t, s_{t+1} \mid h_t) + w \left[ \nabla_{a_t} \log p(a_t, s_{t+1} \mid h_t) - \nabla_{a_t} \log p(\varnothing^A, s_{t+1} \mid h_t) \right] + \beta \nabla_{a_t} Q(h_t, a_t)
$$

---

#### **Summary**

- The **joint model** $p(a_t, s_{t+1} \mid h_t)$, with null tokens, enables both forward and inverse dynamics via conditioning.
- **Classifier-free guidance** interpolates between unconditional and conditional distributions using log-probabilities and their gradients.
- **Q-learning guidance** further biases the model toward high-value actions, integrating RL objectives into the generative process.
- This unified approach allows flexible control over the generation process, supporting both model-based planning and value-based RL in a single framework.

---

**In practice:**  
- During sampling, you can use the guidance scale $w$ (for CFG) and $\beta$ (for Q-learning) to control the strength of conditioning and value guidance.
- The null tokens ensure that marginals and conditionals are well-defined and separated for both state and action spaces.
- This framework enables joint learning and inference of dynamics, inverse dynamics, and value-guided action selection.











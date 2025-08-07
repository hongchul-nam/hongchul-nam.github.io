---
layout: post
title: Autoregressive RL model
date: 2025-08-05 12:00:00
hidden: true
description: Summary of RL
tags: [Generative Model, Flow Matching, RL]
categories: [generative]
---

## Autoregressive RL: Unified Non-Markovian Formulation

In the **non-Markovian** setting, the next state, action, and reward may depend on the entire history, not just the current state and action. In **autoregressive RL**, the *sequence* of actions and states is modeled as an autoregressive process over time (not over state dimensions).

Let us define:

- **History up to time t:**  
  $h_t = (s_0, a_0, r_0, s_1, a_1, r_1, ..., s_t)$
- **State space:** $\mathcal{S}$  
- **Action space:** $\mathcal{A}$  
- **Reward space:** $\mathcal{R}$  

---

### 1. Forward, Inverse Dynamics, and Reward Models

#### **Forward Dynamics**

Predicts the next state $s_{t+1}$ and reward $r_t$ given the full history $h_t$ and the next action $a_t$:
- $P(s_{t+1} \mid h_t, a_t)$  
- $P(r_t \mid h_t, a_t, s_{t+1})$

#### **Inverse Dynamics: Why Learn It?**

Predicts the action $a_t$ that caused the transition from $h_t$ to $s_{t+1}$:
- $P(a_t \mid h_t, s_{t+1})$

**Benefits of learning inverse dynamics:**
- **Imitation and Action Inference:** Enables inferring actions from observed transitions, crucial for imitation learning.
- **Planning and Control:** If a planner proposes a desirable future state $s_{t+1}^*$, the inverse model tells us which action $a_t$ is likely to achieve that state from $h_t$.
- **Model-Based Planning:** Enables a two-step process: (1) plan optimal future states, (2) use inverse dynamics to map those states to actions.

#### **Reward Model**

Predicts the reward $r_t$ given the full history, the current action, and the next state:
- $P(r_t \mid h_t, a_t, s_{t+1})$

---

### 2. Reward Function Learning

In many real-world RL problems, the reward function is not known a priori and must be learned from data (e.g., via IRL, preferences, or human feedback).

- **Parameterization:** $r_\psi(h_t, a_t, s_{t+1})$, where $\psi$ are learnable parameters (e.g., neural network weights).
- **Supervised Reward Learning:**  
  $$
  \mathcal{L}_{\text{reward}} = \mathbb{E}_{(h_t, a_t, s_{t+1}, r_t)} \left[ \ell_{\text{reward}}(r_\psi(h_t, a_t, s_{t+1}), r_t) \right]
  $$
- **Preference-Based Reward Learning:**  
  $$
  \mathcal{L}_{\text{pref}} = -\mathbb{E}_{(\tau^A, \tau^B, y)} \left[ y \log \sigma(R_\psi(\tau^A) - R_\psi(\tau^B)) + (1-y) \log \sigma(R_\psi(\tau^B) - R_\psi(\tau^A)) \right]
  $$
  where $R_\psi(\tau) = \sum_t r_\psi(h_t, a_t, s_{t+1})$.
- **Inverse Reinforcement Learning (IRL):**  
  Learn $r_\psi$ so that the induced policy matches expert demonstrations.

The learned reward function $r_\psi$ can be used as the target for the reward model, to guide policy learning (e.g., in Q-learning), or to generate synthetic rewards for imagined trajectories.

---

### 3. Classifier-Free Guidance (CFG) and Q-Learning Integration

#### **Classifier-Free Guidance for Joint Forward/Inverse Dynamics**

**Null token notation:**
- $\varnothing^A$: null token for action
- $\varnothing^S$: null token for state

**Log-probabilities:**
- Unconditional: $\log p(a_t, s_{t+1} \mid h_t)$
- Marginals: $\log p(a_t, \varnothing^S \mid h_t)$, $\log p(\varnothing^A, s_{t+1} \mid h_t)$

**CFG for forward dynamics:**
$$
\log p_{\text{CFG}}(a_t, s_{t+1} \mid h_t) = \log p(a_t, s_{t+1} \mid h_t) + w \left[ \log p(a_t, s_{t+1} \mid h_t) - \log p(a_t, \varnothing^S \mid h_t) \right]
$$

**CFG for inverse dynamics:**
$$
\log p_{\text{CFG}}(a_t, s_{t+1} \mid h_t) = \log p(a_t, s_{t+1} \mid h_t) + w \left[ \log p(a_t, s_{t+1} \mid h_t) - \log p(\varnothing^A, s_{t+1} \mid h_t) \right]
$$

#### **Gradient Formulation (for Flow Matching or Score-Based Models)**

- **Score for joint:** $\nabla_{a_t, s_{t+1}} \log p(a_t, s_{t+1} \mid h_t)$
- **Score for marginal:** $\nabla_{a_t} \log p(a_t, \varnothing^S \mid h_t)$

**CFG score for forward dynamics:**
$$
\nabla_{s_{t+1}} \log p_{\text{CFG}}(a_t, s_{t+1} \mid h_t) = \nabla_{s_{t+1}} \log p(a_t, s_{t+1} \mid h_t) + w \left[ \nabla_{s_{t+1}} \log p(a_t, s_{t+1} \mid h_t) - \nabla_{s_{t+1}} \log p(a_t, \varnothing^S \mid h_t) \right]
$$

**CFG score for inverse dynamics:**
$$
\nabla_{a_t} \log p_{\text{CFG}}(a_t, s_{t+1} \mid h_t) = \nabla_{a_t} \log p(a_t, s_{t+1} \mid h_t) + w \left[ \nabla_{a_t} \log p(a_t, s_{t+1} \mid h_t) - \nabla_{a_t} \log p(\varnothing^A, s_{t+1} \mid h_t) \right]
$$

#### **Q-Learning as Guidance in the Unified Model**

The Q-function can be used to guide the sampling of actions (and possibly next states) by modifying the joint distribution:
$$
p_{\text{Q}}(a_t, s_{t+1} \mid h_t) \propto p(a_t, s_{t+1} \mid h_t) \cdot \exp(\beta Q(h_t, a_t))
$$

- In log-probability space:
  $$
  \log p_{\text{Q}}(a_t, s_{t+1} \mid h_t) = \log p(a_t, s_{t+1} \mid h_t) + \beta Q(h_t, a_t)
  $$
- In gradient (score) space:
  $$
  \nabla_{a_t} \log p_{\text{Q}}(a_t, s_{t+1} \mid h_t) = \nabla_{a_t} \log p(a_t, s_{t+1} \mid h_t) + \beta \nabla_{a_t} Q(h_t, a_t)
  $$

**Combining CFG and Q-Learning:**
$$
\log p_{\text{CFG+Q}}(a_t, s_{t+1} \mid h_t) = \log p(a_t, s_{t+1} \mid h_t) + w \left[ \log p(a_t, s_{t+1} \mid h_t) - \log p(\varnothing^A, s_{t+1} \mid h_t) \right] + \beta Q(h_t, a_t)
$$

---

### 4. Policy Learning in the Unified Model

Where is the **policy** in this unified model, and how do we learn it?

#### **A. Policy as a Conditional with Null Token on Next State**

By introducing a *null token* for the next state, the policy is defined as the marginal over actions:
$$
\pi(a_t \mid h_t) = P(a_t, s_{t+1} = \varnothing^S \mid h_t)
$$
where $\varnothing^S$ denotes the null token for the next state. This allows direct learning of the policy as a marginal of the joint model.

#### **B. Policy as Interpolation Between Null Token and Q-Value Guidance**

To combine model-based and value-based RL, interpolate between the null-token conditional and Q-value guidance:
$$
\log \pi_{\text{interpolated}}(a_t \mid h_t) = \log P(a_t, s_{t+1} = \varnothing^S \mid h_t) + \lambda \beta Q(h_t, a_t)
$$
where $\lambda \in [0, 1]$ controls the interpolation and $\beta$ is a temperature parameter.

- $\lambda = 0$: pure model-based policy (null token marginal)
- $\lambda = 1$: fully Q-guided policy
- $0 < \lambda < 1$: interpolation

**Gradient for policy interpolation:**
$$
\nabla_{a_t} \log \pi_{\text{interpolated}}(a_t \mid h_t) = \nabla_{a_t} \log p(a_t, \varnothing^S \mid h_t) + \lambda \beta \nabla_{a_t} Q(h_t, a_t)
$$

#### **C. Policy via Planning and Inverse Dynamics**

Alternatively, use a planner to generate a sequence of optimal future states, then use the inverse dynamics model to map each planned state to the corresponding action:

1. **Planning:** Plan a sequence of optimal states 
$s_{t+1}^*, s_{t+2}^*, \ldots$ 
using the forward model and reward.
2. **State-to-Action Mapping:** For each $s_{t+1}^*$, use $P(a_t \mid h_t, s_{t+1}^*)$ to infer the action.
3. **Policy Extraction:** The policy is realized as: plan optimal states, then map to actions via inverse dynamics.

---

### 5. Imagination-Augmented Learning

To improve performance, we can **augment the agent's experience** by generating imagined trajectories using the joint model (model-based imagination or rollouts).

**Imagination-Augmented Objective:**
$$
\mathcal{L}_{\text{aug}} = \mathbb{E}_{(h_t, a_t, s_{t+1}, r_t) \sim \mathcal{D}_{\text{real}} \cup \mathcal{D}_{\text{imag}}} \left[ \ell(h_t, a_t, s_{t+1}, r_t) \right]
$$

**Generating Imagined Data:**
- For $i = 0, \ldots, K-1$:
  $$
  (a_{t+i}, s_{t+i+1}) \sim p_{\text{CFG+Q}}(a_{t+i}, s_{t+i+1} \mid h_{t+i})
  $$

  $$
  r_{t+i} = r_\psi(h_{t+i}, a_{t+i}, s_{t+i+1})
  $$
  
  $$
  h_{t+i+1} = h_{t+i} \cup (a_{t+i}, s_{t+i+1})
  $$

**Augmented Value Estimation:**
$$
Q(h_t, a_t) \leftarrow Q(h_t, a_t) + \alpha \left( r_t + \gamma \max_{a'} Q(h_{t+1}, a') - Q(h_t, a_t) \right)
$$

---

### 6. Null Action in Continuous Spaces: Augmentation Approach

In continuous action spaces, using $a = 0$ as the null action can cause ambiguity. To address this, **augment the action space** with a binary indicator for null actions:

- **Augmented Action:** $\tilde{a}_t = (a_t, m_t)$, $a_t \in \mathcal{A}$, $m_t \in \{0, 1\}$
  - $m_t = 1$: "null" (no-op) action
  - $m_t = 0$: regular action

- **Augmented Joint Model:** $p(a_t, m_t, s_{t+1} \mid h_t)$

- **CFG with Augmentation:**
  $$
  \log p_{\text{CFG}}(a_t, m_t, s_{t+1} \mid h_t) = \log p(a_t, m_t, s_{t+1} \mid h_t) + w \left[ \log p(a_t, m_t = 0, s_{t+1} \mid h_t) - \log p(a_t, m_t = 1, s_{t+1} \mid h_t) \right]
  $$

---

### 7. Summary Table

| Model Type         | Non-Markovian Formulation |
| ------------------ | ---------------------------- |
| Forward Dynamics   | $P(s_{t+1} \mid a_t, h_t)$ |
| Inverse Dynamics   | $P(a_t \mid s_{t+1}, h_{t})$ |
| Reward Model       | $P(r_t \mid s_{t+1}, a_t, h_t)$|
| Reward Function    | $r_\psi(h_t, a_t, s_{t+1})$ |
| Policy             | $\pi(a_t \mid h_t) \propto P(a_t, \varnothing^S \mid h_t) \exp(\lambda \beta Q(h_t, a_t))$ |

---

### 8. Practical Notes

- The inverse dynamics model is essential for mapping planned states to actions, enabling flexible planning and control.
- The policy can be learned directly (from data), as a conditional with a null token on the next state, or as an interpolation with Q-value guidance.
- In practice, $h_t$ is often encoded using recurrent neural networks or transformers to summarize the history efficiently.
- This approach allows the dynamics and reward models to capture long-term dependencies and partial observability, which are not possible in Markovian models.
- Reward function learning enables the agent to operate in environments where the reward is not directly observed or is provided via indirect signals.
- During sampling, you can use the guidance scale $w$ (for CFG), $\lambda$ (for policy interpolation), and $\beta$ (for Q-learning) to control the strength of conditioning and value guidance.
- The null tokens ensure that marginals and conditionals are well-defined and separated for both state and action spaces.
- The reward function $r_\psi$ can be learned jointly with the dynamics and policy models, and used for both real and imagined data.
- This framework enables joint learning and inference of dynamics, inverse dynamics, reward functions, and value-guided action selection.
- To extract a policy for acting, you can sample $a_t$ from the interpolated distribution 
$$
\pi(a_t \mid h_t) \propto P(a_t, \varnothing^S \mid h_t) \exp(\lambda \beta Q(h_t, a_t))
$$
, or plan a sequence of optimal states and use the inverse dynamics model to map each $(h_t, s_{t+1}^*)$ to the corresponding action.

---
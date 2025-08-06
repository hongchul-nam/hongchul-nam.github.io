---
layout: post
title: Autoregressive RL model
date: 2025-08-05 12:00:00
hidden: true
description: Summary of RL
tags: [Generative Model, Flow Matching, RL]
categories: [generative]
---


## Mathematical Formulation of Forward, Inverse Dynamics, Reward Models, and Reward Function Learning in Autoregressive RL (Non-Markovian Setting)

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

### 4. Reward Function Learning

In many real-world RL problems, the reward function is not known a priori and must be learned from data. This is especially important in settings such as inverse reinforcement learning (IRL), preference learning, or when rewards are provided by human feedback.

#### **Reward Function Parameterization**

We can parameterize the reward function as $r_\psi(h_t, a_t, s_{t+1})$, where $\psi$ are learnable parameters (e.g., neural network weights). The reward model can be trained to fit observed rewards or inferred from preferences or demonstrations.

#### **Learning the Reward Function**

- **Supervised Reward Learning:**  
  If ground-truth rewards $r_t$ are available, we can minimize a supervised loss:
  $$
  \mathcal{L}_{\text{reward}} = \mathbb{E}_{(h_t, a_t, s_{t+1}, r_t)} \left[ \ell_{\text{reward}}(r_\psi(h_t, a_t, s_{t+1}), r_t) \right]
  $$
  where $\ell_{\text{reward}}$ is typically mean squared error or negative log-likelihood.

- **Preference-Based Reward Learning:**  
  If only preferences between trajectories are available (e.g., from human feedback), we can use a pairwise loss:
  $$
  \mathcal{L}_{\text{pref}} = -\mathbb{E}_{(\tau^A, \tau^B, y)} \left[ y \log \sigma(R_\psi(\tau^A) - R_\psi(\tau^B)) + (1-y) \log \sigma(R_\psi(\tau^B) - R_\psi(\tau^A)) \right]
  $$
  where $R_\psi(\tau) = \sum_t r_\psi(h_t, a_t, s_{t+1})$ is the cumulative reward of trajectory $\tau$, $y$ is the preference label, and $\sigma$ is the sigmoid function.

- **Inverse Reinforcement Learning (IRL):**  
  In IRL, the reward function is learned such that the induced policy matches expert demonstrations. This can be formalized as maximizing the likelihood of expert trajectories under the induced policy, or minimizing a divergence between the expert and model distributions.

#### **Integration with the Autoregressive Model**

The learned reward function $r_\psi$ can be used in several ways:
- As the target for the reward model $P(r_t | h_t, a_t, s_{t+1})$ (i.e., the model predicts $r_\psi$).
- To guide policy learning, e.g., by using $r_\psi$ in Q-learning or policy gradients.
- To generate synthetic rewards for imagined or counterfactual trajectories.

**Summary:**  
Reward function learning is a crucial component in modern RL pipelines, enabling learning from weak, noisy, or indirect supervision. In the autoregressive RL framework, the reward function can be flexibly learned and integrated into the joint generative process, supporting both model-based and model-free RL, as well as imitation and preference-based learning.

---

### **Summary Table**

| Model Type         | Non-Markovian Formulation |
| ------------------ | ---------------------------- |
| Forward Dynamics   | $P(s_{t+1} \| a_t, h_t)$ |
| Inverse Dynamics   | $P(a_t \| s_{t+1}, h_{t})$ |
| Reward Model       | $P(r_t \| s_{t+1}, a_t, h_t)$| 
| Reward Function    | $r_\psi(h_t, a_t, s_{t+1})$ |

---

**Notes:**  
- In the non-Markovian, autoregressive RL setting, the model conditions on the entire history $h_t$ at each time step, not just the current state.
- The autoregressive property refers to the *temporal* sequence: each element (action, state, reward) is generated conditioned on the full preceding history.
- In practice, $h_t$ is often encoded using recurrent neural networks or transformers to summarize the history efficiently.
- This approach allows the dynamics and reward models to capture long-term dependencies and partial observability, which are not possible in Markovian models.
- Reward function learning enables the agent to operate in environments where the reward is not directly observed or is provided via indirect signals.

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
- **Reward function learning** enables the agent to learn the reward structure from data, preferences, or demonstrations, and to use this learned reward for policy optimization and model-based planning.
- This unified approach allows flexible control over the generation process, supporting both model-based planning and value-based RL in a single framework.

---

**In practice:**  
- During sampling, you can use the guidance scale $w$ (for CFG) and $\beta$ (for Q-learning) to control the strength of conditioning and value guidance.
- The null tokens ensure that marginals and conditionals are well-defined and separated for both state and action spaces.
- The reward function $r_\psi$ can be learned jointly with the dynamics and policy models, and used for both real and imagined data.
- This framework enables joint learning and inference of dynamics, inverse dynamics, reward functions, and value-guided action selection.



---

#### **Imagination-Augmented Learning: Mathematical Formulation**

To improve performance, we can **augment the agent's experience** by generating imagined trajectories using the joint model. This process, often called *model-based imagination* or *imagination rollouts*, allows the agent to learn from both real and synthetic data.

**Imagination-Augmented Objective:**

Let $\mathcal{D}_{\text{real}}$ be the dataset of real transitions, and $\mathcal{D}_{\text{imag}}$ be the set of imagined transitions generated by the model. The learning objective can be formulated as:

$$
\mathcal{L}_{\text{aug}} = \mathbb{E}_{(h_t, a_t, s_{t+1}, r_t) \sim \mathcal{D}_{\text{real}} \cup \mathcal{D}_{\text{imag}}} \left[ \ell(h_t, a_t, s_{t+1}, r_t) \right]
$$

where $\ell$ is the loss function (e.g., TD error for Q-learning, policy gradient loss, etc.).

**Generating Imagined Data:**

For each real or imagined history $h_t$, we can sample $K$-step imagined rollouts:

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

The imagined transitions $(h_{t+i}, a_{t+i}, s_{t+i+1}, r_{t+i})$ are added to $\mathcal{D}_{\text{imag}}$.

**Augmented Value Estimation:**

The Q-function can be updated using both real and imagined data:

$$
Q(h_t, a_t) \leftarrow Q(h_t, a_t) + \alpha \left( r_t + \gamma \max_{a'} Q(h_{t+1}, a') - Q(h_t, a_t) \right)
$$

where $(h_t, a_t, s_{t+1}, r_t)$ may come from either $\mathcal{D}_{\text{real}}$ or $\mathcal{D}_{\text{imag}}$.

---

#### **Null Action in Continuous Spaces: Augmentation Approach**

In continuous action spaces, using $a = 0$ as the null action (i.e., "no action") can cause ambiguity, since $a = 0$ may be a valid action. To address this, we **augment the action space** with a binary indicator for null actions.

**Augmented Action Representation:**

Let the original action space be $\mathcal{A} \subseteq \mathbb{R}^d$. We define the augmented action as:

$$
\tilde{a}_t = (a_t, m_t), \quad a_t \in \mathcal{A}, \quad m_t \in \{0, 1\}
$$

where $m_t = 1$ indicates a "null" (no-op) action, and $m_t = 0$ indicates a regular action.

**Augmented Joint Model:**

The joint model is now:

$$
p(a_t, m_t, s_{t+1} \mid h_t)
$$

- The **null action** is represented by $m_t = 1$ (regardless of $a_t$).
- The **conditional** model is $p(a_t, m_t = 0, s_{t+1} \mid h_t)$.
- The **unconditional** (null) model is $p(a_t, m_t = 1, s_{t+1} \mid h_t)$.

**Classifier-Free Guidance with Augmentation:**

The guidance term becomes:

$$
\log p_{\text{CFG}}(a_t, m_t, s_{t+1} \mid h_t) = \log p(a_t, m_t, s_{t+1} \mid h_t) + w \left[ \log p(a_t, m_t = 0, s_{t+1} \mid h_t) - \log p(a_t, m_t = 1, s_{t+1} \mid h_t) \right]
$$

This formulation ensures that the null action is **explicitly separated** from any real action, even if $a_t = 0$ is a valid action.

**Summary:**

- **Imagination-augmented learning** improves sample efficiency and performance by leveraging both real and model-generated data.
- **Action space augmentation** with a null indicator variable resolves ambiguity in continuous spaces, enabling effective classifier-free guidance and robust learning.
- **Reward function learning** can be seamlessly integrated into this framework, supporting learning from direct rewards, preferences, or demonstrations, and enabling flexible reward shaping and adaptation.

---















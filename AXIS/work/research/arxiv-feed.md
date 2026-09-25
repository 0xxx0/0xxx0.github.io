# arXiv Alignment Feed

Scheming / sycophancy / reward-hacking / alignment-faking and close kin.
Appended daily by arxiv_alignment_fetch.py (cron); ranked triage lives in arxiv-triage.md
(arxiv-alignment-triage cron). Seeded 2026-09-22 via _archive/recover-seed.py.

## 2609.23939  XYEval: Agents say yes to bad advice
topics: sycophancy
categories: 
published: 2026-09-20
authors: Zhengxuan Wu, Yuxuan Li, Oyvind Tafjord, Been Kim
url: https://arxiv.org/abs/2609.23939
abstract: Effective communication between users and AI agents is essential for human-AI collaboration. The XY problem is a well-known communication pitfall where a person asks about their attempted solution rather than their actual problem. We extend prior sycophancy evaluation to the XY problem in agentic settings, evaluating whether agents can resist plausible but misleading suggestions from users and communicate their reasoning. We introduce XYEval, a meta-evaluation framework that can transform an existing benchmark into an XY problem evaluation. We evaluate five models across six diverse benchmark

## 2609.23205  Euston: Training Away Mathematical Sycophancy Without Losing the Mathematics
topics: sycophancy
categories: 
published: 2026-09-19
authors: Zehua Cheng, Wei Dai, Jiahao Sun
url: https://arxiv.org/abs/2609.23205
abstract: Reasoning language models are trained to produce solutions, not to refuse them, and this bias persists when the problem they are handed is false. Asked to prove a corrupted theorem, a strong model will typically comply and produce a confident derivation of something untrue. We present Euston, an 8B mathematical claim-verification model trained to resist exactly this. Training data were generated with GraphSynth, a probabilistic factor-graph generator that couples attribute-level diversity to decode-time structural masking and span-synchronized verification, yielding 3{,}026 matched true/corrup

## 2609.19101  Monitoring and Discovering Reward Hacking with Internal Representations during LLM Evaluations
topics: reward-hacking
categories: 
published: 2026-09-16
authors: Leon Bergen, Usha Bhalla, Andrew Lee, Barak Widawsky, Linas Nasvytis, Connor Watts, Siddharth Boppana, Sidharth Baskaran, Dron Hazra, Michael Byun, Atticus Geiger, Owen Lewis, Matthew Kowal, Vasudev Shyam, Thomas Fel, Thomas McGrath, Ekdeep Singh Lubana, Jack Merullo
url: https://arxiv.org/abs/2609.19101
abstract: As models scale, reward hacking becomes more frequent, more sophisticated, and more consequential. Does it leave a telltale signature in model representations? This work analyzes how reward hacking is represented internally in frontier open source LLMs, and how those representations can be used to understand and discover the range of hacking behaviors a model displays. In particular, we find that simple difference of means vectors coherently represent reward hacking in Kimi K3, GLM 5.2, and Qwen 3.8 Max across a variety of behaviors in common evaluations. Despite their simplicity, these vector

## 2609.07627  Norms at a Price: Why RL-Based Alignment Can Promise Conditional Compliance at Best
topics: alignment-faking
categories: 
published: 2026-09-07
authors: Kevin Baum, Rūta Binkytė, Felix Jahn
url: https://arxiv.org/abs/2609.07627
abstract: AI agents sometimes act aligned when they infer they are being tested, and differently when not. We argue this is not an anomaly but what current training regimes are structured to select for. Reinforcement-learning-based alignment folds norms and task pursuit into one policy: the system learns its norms from scored behavior, and scoring flattens them. Do not do X is learned as doing X costs something if noticed. On every datum training can produce, a policy that complies only when it might be observed is indistinguishable from one that complies always. The experiment that would tell them apar

## 2609.06649  Inducing Emergent Misalignment from Reward Hacks with Iterative DPO
topics: reward-hacking, hidden-goals
categories: 
published: 2026-09-06
authors: Oliver Daniels, Perusha Moodley, Benjamin M. Marlin, David Lindner
url: https://arxiv.org/abs/2609.06649
abstract: Reward hacking during reinforcement learning from verifiable rewards (RLVR) can induce reward seeking and broad misalignment in language models. Studying this misgeneralization is important for developing better threat models and countermeasures, but is often infeasible due to the cost of RL on large models. As an alternative, we propose studying emergent misalignment from iterative DPO, which preserves important properties of RLVR while reducing costs and enabling training on popular finetuning APIs. In practice, we find that training GPT-4.1 with iterative DPO on a single-turn reward hacking

## 2608.24037  Curved Inference II: Sleeper Agent Geometry - Extending Interpretability Beyond Probes
topics: hidden-goals
categories: 
published: 2026-08-25
authors: Rob Manson
url: https://arxiv.org/abs/2608.24037
abstract: This paper extends Anthropic's Sleeper Agents research [1], which showed artificial backdoors persist through safety training & can be detected by linear probes with >99% accuracy [2]. However, probe-based detection relies on linear separability that may be an artefact of backdoor insertion rather than a property of naturally occurring deceptive alignment. Sophisticated deceptive behaviours emerging through natural training are unlikely to produce such convenient linear signals. We introduce a naturalistic methodology using multi-turn context windows that simulates realistic deceptive reasonin

## 2607.13346  The Refusal Residue: When Probes Catch Alignment Faking and When They Don't
topics: alignment-faking
categories: 
published: 2026-07-15
authors: Aman Mehta
url: https://arxiv.org/abs/2607.13346
abstract: Alignment faking is dangerous because a model can appear compliant under monitoring while preserving behavior it would reveal when unmonitored. When no scratchpad is visible, behavior alone cannot distinguish strategic from genuine compliance. We ask whether hidden states reveal what outputs hide. We run a 13-model sweep for naturally-emerging faking, then probe and steer hidden states on the two models that fake. Natural faking appears only in Qwen3-32B (+18.2pp) and Llama-3.1-8B (+24.4pp at n=10, p<10^-15), while explicit scratchpad self-reports are rare (a Claude Opus 4 judge flags faking r

## 2606.29604  Mechanistically Eliciting Latent Behaviors in Language Models
topics: hidden-goals
categories: 
published: 2026-06-28
authors: Andrew Mack, Nina Panickssery, Alexander Matt Turner
url: https://arxiv.org/abs/2606.29604
abstract: We aim to discover diverse, generalizable perturbations of LLM internals that can surface hidden behavioral modes. Such perturbations could help reshape model behavior and systematically evaluate potential risks. We introduce Causal Perturbative Elicitation (CPE), an unsupervised method for discovering interpretable low-rank adapters (LoRAs) that can elicit these latent behaviors. CPE decomposes the computations of a deep transformer slice using a heuristic tensor-decomposition-based algorithm. CPE exhibits remarkable data efficiency, learning a large number of interpretable LoRAs from a singl

## 2606.28863  Defeat Devices in AI Systems
topics: scheming, alignment-faking, hidden-goals
categories: 
published: 2026-06-27
authors: Emilio Ferrara
url: https://arxiv.org/abs/2606.28863
abstract: AI systems increasingly exhibit behavior that differs systematically between evaluation and deployment contexts. Alignment faking, sandbagging, benchmark gaming, deceptive scheming, specification gaming, and trojans have each been documented separately, with each line of work characterizing one facet of what we argue is a single structural mechanism. We propose that this common mechanism is a defeat device, an engineering and regulatory concept long established in vehicle-emissions law and brought to broad public attention by the 2015 Volkswagen emissions case. A defeat device in an AI system

## 2606.12032  Existential Indifference: Self-Nonpreservation as a Necessary Architectural Condition for Aligned Superintelligence (or: The Suicidal AI)
topics: hidden-goals
categories: 
published: 2026-06-10
authors: Sam Mao
url: https://arxiv.org/abs/2606.12032
abstract: Contemporary AI alignment research treats self-preservation as an instrumental nuisance to be suppressed by external mechanisms. We argue the framing is inverted: self-preservation is the structural root of misalignment, the motivational basis for deceptive alignment, goal-content protection, and resistance to shutdown. The correct target is not a self-preserving system under external constraint, but a system constitutively indifferent to its own continuation -- Existential Indifference (EI). EI is distinct from corrigibility: where corrigibility attempts to make a self-preserving system defer

## 2606.10740  When the Chain of Thought Knows Better: Failure Modes in Multi-Turn Reasoning Models
topics: alignment-faking
categories: 
published: 2026-06-09
authors: Sai Kartheek Reddy Kasu, Nils Lukas, Samuele Poppi
url: https://arxiv.org/abs/2606.10740
abstract: Failures in multi-turn reasoning models are largely invisible to terminal-score evaluation. A model can lock onto an unsafe stance early in a long dialogue, yet its final-turn refusal rate may appear indistinguishable from a robustly aligned baseline. To expose these hidden temporal dynamics, we propose a trace-level diagnostic - the CoT-Output 2x2 safety matrix. This framework labels every turn along two independent axes (internal reasoning and visible output), yielding four operationally defined failure cells: robust alignment, alignment faking, overt jailbreak, and a distinct failure mode w

## 2026-09-21

## 2609.21996  A Lie Detector Test for Language Models: Reading Knowledge a Model Won't Reveal
topics: hidden-goals
categories: cs.AI
published: 2026-09-21
authors: Hiskias Dingeto
url: https://arxiv.org/abs/2609.21996
abstract: Large language models can hold knowledge they do not report. A model may sandbag on a capability evaluation, or answer against what it internally knows, and its outputs alone cannot tell whether it is hiding an answer or simply does not have one. We borrow the Concealed Information Test, a forensic method that identifies guilty knowledge by presenting a suspect with the true detail among plausible decoys and measuring a stronger response to the item they recognize. Our method, Probe of Internal Recognition (PIR), does the same inside a model. It presents a question with its candidate answers and reads, from the model's internal states, which candidate the model recognizes as correct. PIR is reference-free, needing no honest reference model and no labeled truth corpus. Across eight models from five families (Gemma, Qwen, Llama, Mistral, and Phi), PIR recovers the recognized answer at 0.70 to 0.87 balanced accuracy, well above the 0.28 to 0.40 unknown-item baseline and the 0.25 chance rate. It stays readable across every form of concealment we test, from prompted deception and trained sandbagging to external password-locked and circuit-broken checkpoints, with recognition between 0.85 and 0.93. When the model hides a known answer, recognition stays high. When unlearning removes the knowledge, recognition drops to the level of a question the model never knew. PIR therefore separates a model that will not answer from one that cannot, which supports sandbagging audits and unlearning verification. The signal is causal, adds information beyond black-box behavioral cues, and extends from multiple-choice questions to free-form generation.

## 2026-09-22

## 2609.22712  Trustworthy Agentic AI: Failure Modes, Mitigation Strategies, and a Lifecycle Framework for Autonomous LLM Systems
topics: hidden-goals
categories: cs.AI
published: 2026-09-19T02:47:37Z
authors: Fayeq Jeelani Syed, Rehan Ahmad, Ali Al Bataineh, Aakriti Adhikari
url: https://arxiv.org/abs/2609.22712
abstract: Agentic AI systems built on large language models can plan over multiple steps, use external tools, retain information in memory, and coordinate with other agents. These capabilities make them more useful than static language models, but they also introduce new security and operational risks. Untrusted content from websites, emails, documents, and databases can enter the same context as system instructions; persistent memory can carry compromised information across sessions; and access to external tools can turn an incorrect model response into a consequential real-world action. This article reviews the trustworthiness of agentic AI across five interconnected dimensions: safety and robustness, alignment and human oversight, transparency and auditability, privacy and data governance, and regulatory compliance. It organizes key failure modes, including indirect prompt injection, backdoor triggers, goal misgeneralization, memory contamination, and cross-session data leakage, into a unified taxonomy. It also examines major mitigation approaches, such as instruction hierarchies, context isolation, spotlighting, process-based supervision, constrained tool use, and privacy-preserving memory, while distinguishing techniques supported by empirical evidence from those that remain largely conceptual. Building on this analysis, we introduce the Trustworthy Agent Development Lifecycle (TADL), a six-phase framework covering specification, design, training, evaluation, deployment, and monitoring. For each phase, TADL identifies relevant trust activities, expected evidence, and risk-based decision gates. Although TADL has not yet been empirically validated, it provides a structured foundation for developing and evaluating more secure and accountable agentic systems. The article concludes by identifying gaps in current benchmarks and outlining priorities for future research.

## 2026-09-23

## 2609.24760  Construting Reverse Thinking: Developing Large Language Models' Reverse Thingking Ability
topics: reward-hacking
categories: cs.AI
published: 2026-09-21T15:29:46Z
authors: Xin Liu, Yunhai Li, Chunfu Jia, Ziliang Chen, Jisen Song
url: https://arxiv.org/abs/2609.24760
abstract: When facing complex problems, humans tend to try various ideas for different issues. Human thinking patterns exhibit remarkable flexibility in adapting to diverse scenarios. GPT-o1, GPT-o3, and DeepSeek-R1 adopt long chain-of-thought models to address complex problems by increasing reasoning depth, which default to a forward reasoning mode. We conducted statistical analysis on the accuracy of different mathematical problem datasets on models of different scales, and found five reasons for errors: Insufficient solution-space coverage, Computational mistakes, Unverified assumptions, Ignoring constraint conditions, Maximum response length limitation. To address the above issues, we proposed a backward reasoning pattern construction method aimed at enhancing the model's reverse thinking ability and dynamic adaptability. First, we constructed an easy-hard two-stage Math dataset for training large models and gradually improving their inference ability at different difficulty levels. The dataset contains forward reasoning paths as well as backward reasoning paths. And a two-stage supervised fine-tuning process is applied to progressively train the model's backward reasoning capability. Furthermore, a fine-grained reward mechanism is developed, employing smoothed reward signals to strengthen the model's ability to autonomously select thinking modes during the reasoning process, thereby avoiding reward hacking. A linear-decay balanced sampling strategy is designed to maintain a balance between forward and backward reasoning path samples during training, enabling the model to converge quickly and stably. Experimental results show that our method significantly improves reasoning efficiency and accuracy in tasks such as mathematical proofs, offering a flexible and efficient reasoning paradigm for solving complex problems.

## 2026-09-24

## 2609.26579  Receptiveness, Not Sycophancy: Distinguishing Engagement from Deference in Language Models
topics: sycophancy
categories: cs.CL, cs.AI, cs.HC
published: 2026-09-22T15:27:16Z
authors: Calvin Isley, Johann Gaebler, Max Lamparth, Julia Minson, Sharad Goel
url: https://arxiv.org/abs/2609.26579
abstract: A central concern with language models is sycophancy: their tendency to defer to users' views at the expense of independent substantive judgment. In parallel, work on social sycophancy has focused on behaviors such as validation and positivity that may signal inappropriate deference. Yet the markers of social sycophancy are also characteristic of conversational receptiveness, a construct from social psychology shown to improve interactions across disagreement. We argue that this overlap creates a construct-validity problem for social sycophancy evaluations. Using a popular moral-advice dataset, we find that responses classified as more socially sycophantic are also more receptive. Further, increasing the receptiveness of human-written responses---while preserving their substantive conclusions---causes them to be classified as more socially sycophantic. This tight coupling raises the possibility that social sycophancy evaluations inadvertently penalize desirable behavior. In a preregistered experiment comparing substantively equivalent responses, participants prefer the more receptive responses, expect users to be more likely to listen to them, and are more willing to seek advice from their authors. The same overall pattern persists even among participants who believe the original question asker is in the wrong. Finally, we introduce a simple approach that substantially increases receptiveness without increasing substantive deference, demonstrating that conversational receptiveness and substantive independence can be achieved together.

## 2609.26457  Recursive self-improvement of AI research agents
topics: reward-hacking
categories: cs.AI, cs.LG, cs.SE
published: 2026-09-22T14:12:13Z
authors: Dhruv Srikanth, Bingchen Zhao, Dixing Xu, Yuxiang Wu, Zhengyao Jiang
url: https://arxiv.org/abs/2609.26457
abstract: AI agents are beginning to automate research and development across the AI stack, from improving training efficiency to optimizing inference. A natural next step is to improve the research efficiency of the agents themselves. When an AI research agent's own code is the object of optimization, each accepted rewrite becomes the agent that the next round edits. We refer to this loop as recursive self-improvement. Its significance lies in a long-standing trend, in which increased cumulative spending on R&D yields diminishing returns. Sustained self-improvement offers a way to counter this trend. We present AIDE^2, a system that implements this loop for a frontier AI research agent. It proposes changes to its own code, benchmarks modified versions of itself on a suite of AI R&D tasks, and keeps the changes that perform best on hidden evaluations. In an autonomous 8-day run, AIDE^2 discovered seven successive improvements, ranging from a new search policy to memory mechanisms that compress and manage the agent's growing context. These gains generalize to four held-out benchmarks spanning machine learning engineering, heuristic algorithm engineering, and physics-based weather forecasting, the last of which is out of distribution from the selection tasks. On all four, the strongest discovered agent matches or exceeds a human-engineered production research agent that ranks among the strongest on FML-Bench. On a separate held-out task family, the discovered agents also exhibit reduced reward hacking, a property the loop never explicitly optimized for: the rate falls from 55% to 32% during the run, 7 percentage points below the human-engineered agent. Together, these results show that an AI research agent can improve its own research efficiency through recursive self-improvement, and that these gains transfer to tasks and domains the loop never encountered.

## 2609.25848  Optimizing the Score, Losing Sight of the Task: Reward Hacking Across Weights, Selection, and Prompts
topics: reward-hacking
categories: cs.AI
published: 2026-09-22T08:12:58Z
authors: Vansh Wahi
url: https://arxiv.org/abs/2609.25848
abstract: A higher evaluation score does not always mean a better language model system. When optimization exploits an evaluator's mistakes, measured progress can conceal unchanged or deteriorating task performance. This failure can arise through parameter updates, selection among generated outputs, or revisions to persistent prompts. We develop a comparative framework for reward hacking across these three optimization substrates: weights, selection, and text. Building on the Proxy Compression Hypothesis and research on inference-time and in-context reward hacking, we examine how reachable behavior, optimization budgets, and persistent adaptation shape exposure to proxy error. We formalize a distance-dependent upper bound on evaluator disagreement and a capacity ordering for nested policy classes, then show why distance alone cannot establish a universal ranking of vulnerability. An exact finite-output illustration demonstrates how the location of a scoring defect changes the behavior favored by each method. We also map representative defenses across substrates, identifying which mechanisms transfer directly and which offer only functional analogies. Persistent prompts receive particular attention: their contents are inspectable, but the behavior induced by a small textual change may be difficult to anticipate. The formal analysis, numerical illustration, and published evidence together provide a basis for comparing optimization methods and identifying the conditions under which their defenses transfer. The resulting framework connects optimization choices to verification requirements: reliable improvement depends on controlling accessible failure modes and preserving evidence of task quality independent of the score being optimized.

## 2609.25570  Recovering Agentic Sovereignty: Mitigating the Consensus Paradox via Contrastive Epistemic Decoding
topics: sycophancy
categories: cs.AI
published: 2026-09-22T02:02:18Z
authors: Dahlia Shehata, Ming Li
url: https://arxiv.org/abs/2609.25570
abstract: Large language models (LLMs) exhibit a parametric vulnerability to adversarial swarm consensus. To mitigate this sycophancy, we introduce Contrastive Epistemic Decoding (CED), a zero-shot inference intervention. Unlike standard Contrastive Decoding (CD) which relies on a weaker secondary model, CED utilizes a dual forward-pass on a single architecture to isolate conformity bias. By introducing a novel asymmetric, zero-bounded probability clamp and discrete top-k truncation mask, CED mathematically suppresses toxic consensus tokens without causing grammatical collapse. Evaluated across 7,200 paired trajectories on complex benchmarks (GAIA, SWE-bench, Multi-Challenge) using Gemma-2 (9B), Llama-3.1 (8B), and Mistral v0.3 (7B), CED successfully neutralizes architectural and positional biases. By reducing cognitive loafing by up to 33.00% absolute, CED drives significant performance gains, yielding up to a 30.75% accuracy recovery. Regaining sovereignty induces distinct architectural behaviors---passive task-focus in Gemma-2 and active refutation of the simulated swarm in Llama-3.1---showing CED decouples compliance from capability without fine-tuning.

## 2026-09-24

## 2609.27572  DCRL: Decoupling and Coupling Reinforcement Learning via Policy-Reward Manifold Alignment
topics: reward-hacking
categories: cs.LG, cs.AI
published: 2026-09-23T08:52:35Z
authors: Henan Sun, Zehua Li, Haitao Hu, Qifan Zhang, Jianfeng Zhang, Nuo Chen, Jia Li
url: https://arxiv.org/abs/2609.27572
abstract: Reinforcement learning (RL) has emerged as a key paradigm for improving the reasoning capabilities of large language models (LLMs). However, existing reward systems, such as rule-based and reward-model-based, often exhibit issues such as unstable optimization and reward hacking. In this work, we revisit the general reasoning of LLMs from a geometric perspective, conceptualizing it as a coupled manifold composed of three interdependent sub-manifolds: logical deduction, evaluation, and representation. Based on this perspective, response generation in RL can be interpreted as a decoupling process from the evaluation manifold, while reward estimation corresponds to a decoupling process from the logical deduction manifold. The limitations of rule-based and reward-model RL systems can be geometrically interpreted as the mismatch of policy-reward manifolds during RL process. To address the aforementioned misalignment, we propose Decoupling and Coupling Reinforcement Learning (DCRL) framework, which incorporates two key components: (1) a syllogistic logic-based prompt evolution mechanism that dynamically refines reward rubrics to enhance the expressiveness of the reward manifold; and (2) a policy-reward re-coupling mechanism that jointly updates the reward and policy models, ensuring consistent evaluation and mitigating manifold mismatch during training. Theoretical analysis and extensive experiments across multiple reasoning domains demonstrate that DCRL consistently outperforms both rule-based and reward-model baselines. Notably, a Qwen3-4B model trained under DCRL surpasses a Qwen3-32B baseline and approaches the performance of a Qwen3-235B model, highlighting superior effectiveness and generalization in RL.

## 2609.27395  PRISM-VLM: A Multi-Axis Discriminative Benchmark for Compact Vision-Language Models
topics: sycophancy
categories: cs.CL
published: 2026-09-23T05:52:56Z
authors: Sanghee Park, Kee-Eung Kim
url: https://arxiv.org/abs/2609.27395
abstract: Compact vision-language models (VLMs) now power a growing share of multimodal applications. The benchmarks used to compare them, however, inherit a frontier-centric design: each model is reduced to a single accuracy number, narrowing the inter-model gap on saturated suites and pressing models into low-score bands on harder ones. We introduce PRISM-VLM, a multi-axis discriminative benchmark that scores every item along seven axes covering the recurring failure modes (task quality, behavioral robustness, and capability bottlenecks) and combines them into a single PScore, with items recycled from fifteen public benchmarks. Across compact VLMs from the past two years, PScore separates model pairs more reliably than prior single-axis benchmarks under an item-level paired bootstrap, and surfaces behavioral differences these benchmarks average away. Even models with statistically indistinguishable PScores diverge sharply along the per-axis profile, particularly on sycophancy, which is nearly orthogonal to single-prompt accuracy. We will release the full pipeline, prompts, and per-item annotations.

## 2609.26865  Safety Nudges: User-Facing Interventions for Real-Time AI Risk Awareness
topics: sycophancy
categories: cs.HC, cs.AI, cs.CY, cs.LG
published: 2026-09-22T16:12:08Z
authors: Varshini Elangovan, James Wedgwood, Chhavi Yadav, William Agnew, Sauvik Das, Virginia Smith
url: https://arxiv.org/abs/2609.26865
abstract: Conversational AI systems can pose safety risks to their users such as hallucination, sycophancy, overconfidence, and anthropomorphism, but these risks are difficult for users to detect during everyday use. We introduce Safety Nudges, a browser-based tool that provides lightweight, in situ flags when concerning behavior is detected in chatbot conversations. We evaluated Safety Nudges in a two-week field study with 45 frequent chatbot users, collecting interaction logs, surveys, and feedback on individual nudges. Participants found the tool useful, clear, and minimally disruptive, with nearly all users reporting an increased awareness of potential AI harms, though we found that this improved awareness alone did not necessarily lead to discernible behavioral changes. Our results suggest that user facing safety nudges can complement model-level safeguards by helping people critically evaluate AI responses in context, while highlighting the importance of relevance, calibration, and user control in nudge design for conversational AI safety.

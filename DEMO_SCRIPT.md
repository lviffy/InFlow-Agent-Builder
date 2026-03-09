# InFlow Demo Script

## Goal

Record a 3-minute demo that clearly shows the OneChain integrations, agent creation flow, and marketplace story for judging.

## Prep Checklist

- Run the Supabase migration before recording.
- Make sure the frontend, backend, and n8n agent backend are all running.
- Fund the demo wallet with enough OCT for one clean transaction.
- Pre-create or be ready to create one public agent for the marketplace segment.
- Keep one `.one` example ready, such as `alice.one`.

## Demo Flow

### Scene 1: Identity and Setup (0:00 - 0:25)

Open the app and show the connected wallet.

Voiceover:

"This is InFlow on OneChain. Every user gets a persistent on-chain identity layer for agents, including a wallet, DID, and support for ONS names. That gives AI agents a reusable identity and a better user experience from the start."

Point out:

- Wallet connection
- DID in the profile UI
- ONS name if available

### Scene 2: Create a GameFi Agent (0:25 - 1:00)

Go to the workflow builder and create an agent using the templates or tool graph.

Voiceover:

"We added GameFi-focused agent templates for the hackathon. Instead of building everything manually, creators can start from templates for token rewards, NFT drops, treasury actions, and gameplay flows, then customize the workflow visually."

Point out:

- Templates tab
- Tool nodes relevant to rewards, transfers, NFTs, and price checks
- Agent name and description

### Scene 3: Gas Sponsorship (1:00 - 1:20)

Show the gas budget field while saving the agent.

Voiceover:

"Each agent can sponsor execution with a gas budget in OCT. That removes friction for end users and makes the experience feel closer to a real consumer app instead of a raw wallet interface."

Point out:

- Gas budget input
- Saved badge showing sponsored gas

### Scene 4: Live Agent Execution (1:20 - 2:10)

Open the chat page for the agent and run a natural-language prompt.

Suggested prompt:

"Send 0.1 OCT to alice.one and show me my USDO balance after that."

Voiceover:

"The agent understands natural language, routes to the right tools, resolves ONS names like `alice.one`, and can work with both native OCT and stable assets like USDO. That lets users interact with OneChain features in plain English instead of raw contract calls."

Point out:

- Suggested prompt chips
- Gas sponsorship badge in chat
- ONS name resolution
- Transaction or response output
- USDO support in the result if available

### Scene 5: Marketplace (2:10 - 2:40)

Open the marketplace and show public agents.

Voiceover:

"Agents are not isolated. Creators can publish them to a marketplace, other users can discover them, inspect supported tools, and clone them into their own workspace. This turns individual workflows into reusable on-chain products."

Point out:

- Marketplace listing
- Creator DID or ONS identity
- Tool chips
- Clone action

### Scene 6: Closing (2:40 - 3:00)

End on the homepage, marketplace, or chat page.

Voiceover:

"InFlow turns OneChain capabilities into reusable AI agents with identity, gas sponsorship, stablecoin support, ONS resolution, GameFi templates, and a publishable marketplace. That makes OneChain easier to use, easier to build on, and easier to scale through agents."

## Recording Tips

- Record at 1080p with browser zoom around 90% to 110%.
- Preload the pages you will navigate to so the demo feels immediate.
- Type prompts in advance if you want faster pacing.
- Keep the final cut close to 3 minutes.
- If one blockchain action is slow, narrate the expected result and show the relevant UI state.
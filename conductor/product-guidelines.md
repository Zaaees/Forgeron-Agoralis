# Product Guidelines

## Brand & Tone
- **Minecraft Theme:** The UI must maintain a Minecraft-inspired aesthetic, using appropriate terminology (Forgerons, Enchanteurs, XP, items, stacks).
- **Professional & Functional:** The primary focus is utility. The tone should be direct, helpful, and clear, avoiding unnecessary fluff while maintaining immersion in the roleplay/economy context.
- **Visuals:** Use established background themes (e.g., Dark, Light, Nether, Emerald, Amethyst) and Minecraft-style icons/emojis to guide navigation.

## UX/UI Principles
- **Single Page Application (SPA):** Maintain fast, seamless tab switching without full page reloads to keep users focused.
- **Mobile-Friendly:** Ensure all calculators, tables, and notes are responsive and usable on smaller screens.
- **Instant Feedback:** Calculations (XP, prices, profit, smelting limits) should update in real-time as users adjust inputs. Provide clear toast notifications for actions (copy, save, delete).
- **Accessibility:** Use sufficient contrast, especially in dark mode, and provide clear indicators for active tabs and selected options.
- **Copy-to-Clipboard:** Enable quick copying of results (prices, totals) to facilitate fast trading in-game.

## Code Quality & Architecture
- **Vanilla Stack:** Maintain the lightweight nature of the application using pure HTML, CSS, and JavaScript. Avoid heavy frontend frameworks unless absolutely necessary for complex state management.
- **State Management:** Keep local state synchronized with Firebase to ensure data persistence across sessions. Handle network delays gracefully with loading overlays.
- **Security:** Ensure role-based access control (Admin, Forgeron, Enchanteur, Visiteur) is strictly enforced in the UI, falling back to read-only modes where appropriate.
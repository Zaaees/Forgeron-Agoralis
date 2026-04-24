# Tech Stack

## Core Technologies
- **Languages:** HTML5, CSS3, JavaScript (ES6+)
- **Backend-as-a-Service:** Firebase (v10.9.0)
  - **Authentication:** Custom PIN-based login (pseudo Minecraft + 4-digit PIN)
  - **Firestore:** Cloud NoSQL database for notes, catalog, and user data.
- **Hosting:** Firebase Hosting (forgerons-agoralis.firebaseapp.com)

## Frontend Implementation
- **Vanilla JS:** The application uses pure JavaScript for all UI logic, calculations, and data synchronization. No frontend frameworks (like React or Vue) are used to maintain maximum performance and low bundle size.
- **Responsive Design:** CSS Grid and Flexbox are used to ensure the application works across desktop and mobile devices.
- **Dynamic Theming:** Custom CSS properties (variables) for multiple themes (Dark, Light, Nether, Emerald, Amethyst).

## Architectural Patterns
- **SPA (Single Page Application):** Navigating between features (Achats, Forge, Enchants, etc.) is handled by manipulating the DOM within a single HTML page.
- **Event-Driven UI:** UI updates are triggered by user input events and Firebase real-time listeners.
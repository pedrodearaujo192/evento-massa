# **App Name**: EventoMassa

## Core Features:

- User Authentication: Allow users (super_adm, adm_evento, usuario) to authenticate via email/password using Firebase Authentication.
- Role-Based Access Control: Implement role-based access control (super_adm, adm_evento, usuario) to restrict access to certain features and data.
- Event Management: Allow adm_evento to create, edit, and delete events, including uploading event images to Firebase Storage. super_adm can view all events.
- Ticket Generation and Management: Generate unique QR codes for tickets, allow admins to create tickets manually, and manage ticket status (active, used, canceled).
- Check-in System: Implement a check-in system using QR code scanning to validate tickets and record check-in time.
- Reporting and Analytics: Generate reports on event performance, including total tickets issued, check-ins, and attendee lists. Super Admins can access these.
- Admin Dashboard: Provide dedicated panels for super_adm and adm_evento to manage users, events, and tickets, designed for ease of use.

## Style Guidelines:

- Primary color: Soft gold (#D4AF37) to evoke a premium, luxurious feel associated with the beauty industry. The gold symbolizes quality and exclusivity.
- Background color: Light nude (#F5F5DC), a very desaturated near-beige hue that provides a clean, elegant backdrop, allowing event details and visual content to stand out.
- Accent color: Deep charcoal gray (#36454F) to provide a contrasting accent, ensuring key elements such as buttons and interactive components are easily noticeable against the lighter backdrop.
- Headline font: 'Playfair', a modern serif similar to Didot, offering an elegant, fashionable, and high-end aesthetic.
- Body font: 'PT Sans' (sans-serif), paired with Playfair, providing a clean, readable style suitable for detailed event information.
- Use minimalist icons in a line style to represent event categories and actions.
- Employ a card-based layout for events to showcase key details, supplemented by large, high-quality images.
- Incorporate subtle transition animations and loading indicators to provide a smooth user experience.
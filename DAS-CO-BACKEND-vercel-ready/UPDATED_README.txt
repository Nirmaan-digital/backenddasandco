DAS & CO - CORRECTED BACKEND API

This backend companion fixes the live Hostinger/MySQL data flow used by dasandco.online.

FIXES IN THIS BUILD
- Orders always calculate gold earned on the server from the selected client's saved default earning percentage.
- The frontend no longer needs to submit duplicate order/earning fields.
- Orders return normalized project_name, gold_weight, percentage and earning_gold fields even though the legacy MySQL schema uses ornament_name/gross_weight/wastage_percent/gold_earned.
- Existing orders with a zero stored gold_earned value are calculated from their stored gold weight and client percentage.
- New order weight is persisted correctly.
- Completed orders sync their calculated earnings into the gold vault once.
- Order deletion removes its linked gold transaction before deleting the order.
- Client statistics include order count, gold designed, gold earned and last order date.
- Client deletion removes linked order/gold records first so foreign-key constraints do not block it.
- Dashboard statistics calculate earnings from real order/client data.
- Settings endpoint stores the studio details, default earning percentage and 24K/22K/18K rates, adding missing legacy columns automatically when needed.
- Legacy orders table is automatically extended with category/notes columns when needed.

DEPLOYMENT
1. Deploy this backend to the Node.js application serving https://api.dasandco.online.
2. Keep the existing DB_HOST, DB_USER, DB_PASSWORD, DB_NAME and JWT_SECRET environment variables.
3. Restart the Node.js application after replacing the files.
4. Then deploy the corrected frontend package to dasandco.online.

IMPORTANT
The frontend alone cannot repair records that the backend is still returning with zero/legacy fields. Deploy the backend package as well.

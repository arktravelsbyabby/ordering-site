ARK's VEETU SAAPADU — Final Prototype

Files included:
- index.html
- styles.css
- script.js
- background.png (your provided image)
- README.txt (this file)

What I changed based on your requests:
1. Only the background is dimmed via an overlay — menu, forms and text are fully opaque/clear.
2. Admin UI removed. soldOutDates is a JS array in script.js you can edit manually.
3. EmailJS calls use a single template variable {{message}}. The template id/service id/public key you provided are already placed in script.js.
4. SMS attempted via Xfinity email-to-SMS gateway: 3464908604@vtext.comcast.net (configured in script.js). Note: EmailJS templates usually have recipients configured in the EmailJS dashboard — if your template only delivers to a specific address, consider creating a second template that targets the SMS gateway.

How to use locally:
1. Unzip and open index.html in your browser.
2. Date picker enforces 2-day notice.
3. Orders/limits are enforced using localStorage (prototype). For global enforcement across users, a server-side backend + DB is required.
4. To enable EmailJS sending, ensure the EmailJS service/template in your EmailJS dashboard is configured to deliver to your email (and/or to the SMS gateway). The script uses the service/template/public key you provided:
   - Service ID: service_s3wa5uh
   - Template ID: template_loeevn8
   - Public Key: WiUVr4jNMTM5mLk2F

Manual edits:
- Edit soldOutDates array in script.js to mark any date as sold out.
- To change SMS number, edit SMS_GATEWAY in script.js.

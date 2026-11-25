# iOS Shortcuts for Tane

Two ways for Shortcuts to log a payment. Both work offline and need no account.

| Way | What it does | Best for |
| --- | --- | --- |
| **Inbox note** | Writes a small note into `Tane/inbox/`. Tane turns it into an expense marked "to review" the next time it runs, and trashes the inbox note. | Fully automatic capture (Wallet tap, payment notifications) |
| **Link** `obsidian://tane?...` | Opens Obsidian with the add-transaction form pre-filled. You check it and tap Save. | Quick manual logging from the home screen, a widget or Back Tap |

The inbox note format is in `docs/data-model.md` § Inbox note. Tane finds the wallet by matching `card` against wallet names and their `aliases`, so add the exact card name iOS shows (for example `Rakuten Card`, `楽天カード`) to the wallet's `aliases`.

## 1. Tap a card in Apple Wallet → inbox note

1. Shortcuts → **Automation** → **+** → **Wallet** → choose your cards → **Run Immediately** → Next.
2. Add **Text** with:

   ```
   ---
   amount: [Shortcut Input → Amount]
   merchant: "[Shortcut Input → Merchant]"
   card: "[Shortcut Input → Card or Pass]"
   captured_at: [Current Date, format "yyyy-MM-dd'T'HH:mm:ss"]
   source: wallet-tap
   ---
   ```

   Insert each bracket as a variable from the Shortcut Input (tap it to pick the field).
3. Add **Save File**: Service **iCloud Drive**, folder `Obsidian/<your vault>/Tane/inbox`, file name `[Current Date] wallet` (any unique name), "Ask where to save" off, "Overwrite" off.
4. Done. After the next payment, open Obsidian: the review box in the Tane panel shows the expense; tap **Confirm** or open it to fix the category.

## 2. PayPay and other apps

iOS does not let Shortcuts read other apps' notifications, so payments outside Apple Wallet cannot be captured silently. Use the quick-log link (3) right after paying, or, if the app emails a receipt, an **Email** automation that saves an inbox note with `source: notification` and `card: PayPay` (amount via **Match Text**, for example `([0-9,]+)円`).

## 3. Quick log from the home screen → link

1. New shortcut "Log expense".
2. **Ask for Input** (Number): "Amount?".
3. **URL**: `obsidian://tane?amount=[Provided Input]&merchant=&wallet=PayPay`
4. **Open URLs**.
5. Add it to the home screen, or Settings → Accessibility → Touch → **Back Tap** → Double Tap → "Log expense".

Every parameter is optional: `amount`, `type` (`expense`, `income`, `transfer`, `lend`…), `wallet`, `category`, `person`, `merchant`, `note`, `date` (`YYYY-MM-DD`). Unknown or invalid values are ignored.

## Troubleshooting

- Inbox note stays in `inbox/` and shows under "Needs review": the card name matches no wallet. Add it to that wallet's `aliases`.
- Two devices: if both Mac and iPhone process the same inbox note, they produce the same transaction id, so you get one transaction (D-012).

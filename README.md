# All in Time website

A fast static website with a built-in CMS at `/admin`. No monthly cost on Netlify's free plan.

## Go live (about 15 minutes, once)

1. **Put the code on GitHub.** Create a free account at github.com, make a new public repository called `allintime`, and upload everything in this folder. You can drag and drop it on the repo page.
2. **Connect Netlify.** Create a free account at netlify.com, then choose *Add new site → Import an existing project → GitHub* and pick `allintime`. Leave the settings as they are (`netlify.toml` handles them) and click Deploy.
3. **Turn on the CMS login.** In Netlify, open *Site configuration → Identity → Enable Identity*. Then:
   - under *Registration*, set it to **Invite only**
   - under *Services → Git Gateway*, click **Enable Git Gateway**
   - under *Identity*, click **Invite users** and invite your own email

   Open the invite email, set a password, and you're in the CMS.
4. **Get form emails.** Open *Site configuration → Forms*, click **Enable form detection**, then redeploy once (*Deploys → Trigger deploy*). Under *Forms → Form notifications*, add an email notification for the `contact` form so every enquiry and valuation request goes to your inbox.
5. **Domain (optional).** Under *Domain management*, add `allintime.dk` or any domain you own and follow the DNS steps.

## Everyday use

Go to `yoursite.netlify.app/admin` (or `allintime.dk/admin`) and log in.

- **Add a watch:** Watches → New Watch. Fill in the brand, model and photos (the first photo is the main one), then Publish. It's live in about a minute.
- **Price:** leave it on *Price on request*, or choose *Show price* and enter the amount in DKK.
- **Reserved or sold:** change the Status. Sold watches move to the Archive automatically. Nothing gets deleted.
- **Front page feature:** tick *Feature on front page* on the 3 or 4 watches you want in the "Under the loupe" section.
- **Order:** lower *Sort order* numbers show first.
- **Photo crop:** if a watch is cut off in the grid, adjust the *Photo focus* numbers. 50/50 is the centre.
- **Site text:** under *Site text*, you can change the headlines, contact email, Instagram handle and hero photo.

## Files

- `index.html`, `styles.css`, `app.js`: the site
- `content/watches/*.json`: one file per watch (written by the CMS)
- `content/settings.json`: site text and contact details
- `media/uploads/`: photos
- `admin/`: the CMS (Decap CMS)
- `build.js`: combines the watch files into `content/watches.json` on every deploy

To preview on your own computer, run `node build.js`, then `python3 -m http.server` in this folder and open http://localhost:8000.

# GSN Campaign Renderer V1

Status: Prototype renderer, separate from the production GSN app and trust infrastructure.

## Purpose

The renderer converts an approved structured campaign specification into branded campaign assets for human review:

- vertical MP4, 1080x1920, 9:16;
- 1080x1350 poster;
- 1080x1080 square image;
- video thumbnail;
- end card;
- SRT captions;
- render manifest.

It does not decide campaign strategy, copy, targeting or publication. It does not publish to social platforms.

Required workflow:

```text
Campaign prepared -> Renderer generates assets -> Human review -> Founder approval -> Publish
```

## Files

- `brand.gsn.json` - reusable GSN brand settings.
- `specs/campaign-001.json` - first renderer test case, `Your Community Already Has Trust`.
- `specs/campaign-001-youtube-v2.json` - image-led Campaign 001 V2 with audio generation settings.
- `render_campaign.py` - local V1 renderer using PIL for frames/static assets and FFmpeg for MP4.
- `render_campaign_image_led.py` - V2 image-led renderer for Campaign 001.
- `add_audio.py` - post-processes a render with local narration and a generated low-volume music bed.
- `renders/` - generated outputs, ignored by operational meaning until approved.

## Render Command

```bash
python campaign_renderer/render_campaign.py --spec campaign_renderer/specs/campaign-001.json --brand campaign_renderer/brand.gsn.json
```

The command prints the render output directory.

Image-led V2 with audio draft:

```bash
python campaign_renderer/render_campaign_image_led.py --spec campaign_renderer/specs/campaign-001-youtube-v2.json --brand campaign_renderer/brand.gsn.json
```

## V1 Boundary

V1 renders a silent MP4 with visible captions and a companion `.srt` file. V2 can add local synthetic narration plus a generated low-volume music bed, but the audio is still a review draft. Generated assets are drafts until visually reviewed, listened to, and approved by the Founder.

Devil truth: a rendered MP4 is not a campaign, not outreach and not traction. It is only a production asset awaiting human review.
## Verify Render

```bash
python campaign_renderer/verify_render.py campaign_renderer/renders/<render-output-directory>
```

The verifier checks the MP4 dimensions/duration, static output dimensions, basic nonblank image sampling, captions, manifest outputs, and the not-published render status.

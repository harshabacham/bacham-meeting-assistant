import asyncio
import os
import shutil
from playwright.async_api import async_playwright

async def record():
    print("Starting Playwright 1080p 60fps recording for Bacham Launch Trailer...")
    os.makedirs("videos/temp_rec", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        context = await browser.new_context(
            record_video_dir="videos/temp_rec",
            record_video_size={"width": 1920, "height": 1080},
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        html_path = os.path.abspath("videos/teaser.html").replace("\\", "/")
        print(f"Navigating to file:///{html_path}")
        await page.goto(f"file:///{html_path}")
        print("Recording 55 seconds of 1080p animation sequence...")
        await page.wait_for_timeout(55500)
        print("Finishing context and finalizing video encoding...")
        await context.close()
        await browser.close()

    temp_files = os.listdir("videos/temp_rec")
    print(f"Recorded temp files: {temp_files}")
    for f in temp_files:
        if f.endswith(".webm"):
            src = os.path.join("videos/temp_rec", f)
            dst = os.path.join("videos", "bacham-launch-teaser.webm")
            if os.path.exists(dst):
                os.remove(dst)
            shutil.move(src, dst)
            size_mb = round(os.path.getsize(dst) / (1024 * 1024), 2)
            print(f"SUCCESS: Saved new video to {dst} ({size_mb} MB)")
            shutil.rmtree("videos/temp_rec", ignore_errors=True)
            return dst

if __name__ == "__main__":
    asyncio.run(record())

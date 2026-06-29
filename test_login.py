import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        page.on('console', lambda msg: print(f'CONSOLE: {msg.type}: {msg.text}'))
        page.on('pageerror', lambda err: print(f'ERROR: {err}'))
        
        print('Navigating to http://localhost:5173/')
        await page.goto('http://localhost:5173/')
        await asyncio.sleep(2)
        
        print('Filling login form...')
        await page.fill('input[type="email"]', 'demo@email.com')
        await page.fill('input[type="password"]', 'demo')
        await page.click('button[type="submit"]')
        await asyncio.sleep(5)
        
        await browser.close()

asyncio.run(main())

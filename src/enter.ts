import { type BrowserContext } from 'playwright'
import { delay } from './delay'

// enter presses the enter key.
export async function enter (context: BrowserContext): Promise<void> {
  const pages = context.pages()
  const page = pages[pages.length - 1]
  await page.keyboard.press('Enter')
  await delay(2000)
}

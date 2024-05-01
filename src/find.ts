import type {BrowserContext} from 'playwright'
import {delay} from './delay'
import {Tool} from '@gptscript-ai/gptscript/lib/tool'
import {exec} from '@gptscript-ai/gptscript'
import {summarize} from './browse'

export async function find (context: BrowserContext, userInput: string, action: string, keywords?: string[]): Promise<string[]> {
  const pages = context.pages()
  const page = pages[pages.length - 1]

  let elementData = await summarize(page, keywords ?? [], action)
  // If no data found, try to find the element without keywords first
  if (elementData === '' && keywords == null) {
    elementData = await summarize(page, [], action)
  }
  // Scroll the page to get more data and try to find the element
  // Retry 60 times also to give user time to sign in if the landing page requires sign in
  let retry = 0
  while (elementData === '' && retry < 60) {
    await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('div'))
      const scrollables = allElements.filter(e => ((e.getAttribute('style')?.includes('overflow: auto') ?? false) || (e.getAttribute('style')?.includes('overflow: scroll') ?? false)))
      if (scrollables.length > 0) {
        scrollables[0].scrollBy(0, window.innerHeight)
      }
    })
    await delay(2000)
    elementData = await summarize(page, keywords ?? [], action)
    retry++
  }

  const betterInstructions: string = `You are an expert with deep knowledge of web pages, the Playwright library, and HTML elements.
    Based on the provided HTML below, return the locator that can be used to locate the element described by the user input.
    Use an ID or text-based locator if possible. Validate the locator before you return it. Do not escape the locator unless necessary.
    Return exactly one locator that is the best match, and don't quote the output.
    
    User Input: ${userInput}
    
    HTML:
    
    ${elementData}`

  // const oldInstructions: string = `you are an expert in understanding web pages, playwright library and HTML elements and can help me find the information I need.
  //  You will be given html content and asked to find specific elements or information.
  //  Based html data provided below, return the locator that can be used to locate the element using playwright library page.locator().
  //  When asked about filling data, find all the element like input, form, textarea. return the most accurate locator you can find.
  //  When asked about clicking button, only find all the button elements. If you can't find button, find div instead. return the most accurate locator you can find.
  //  When asked about clicking links, Only find link that are relevant to what user is looking for. Return exact one link that is the best match.
  //  Use id or text based locator first. Validate the locator before returning. Don't escape the locator with \\ unless it is necessary. Return exact one locator that is the best match
  //  Provided data: '${elementData}'.
  //  UserInput: ${userInput}
  //
  //  Don't quote the output.`

  const tool = new Tool({
    instructions: betterInstructions
  })

  const output = (await exec(tool, {})).replace('\n', '').trim()

  return [output]
}

require("dotenv").config();
const accounts = require("./accounts");
const puppeteer = require("puppeteer");
const TelegramBot = require("node-telegram-bot-api");

(() => {
  run();
})();

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
  });
  const page = await browser.newPage();
  await page.setDefaultTimeout(Number(process.env.TIMEOUT) * 1000);
  try {
    await login(page);
    await clickContinueButton(page);
    await editForm(page);
    await processPages(page);
  } catch (e) {
    await run();
  } finally {
    setInterval(run, Number(process.env.TIME_INTERVAL) * 60 * 1000);
  }
}
async function login(page) {
  await page.goto(process.env.LINK_GOV);

  await page.type("#username", process.env.USERNAME);
  await page.type("#password", process.env.PASSWORD);
  await page.keyboard.press("Enter");
  await page.waitForNavigation();
}

async function clickContinueButton(page) {
  await page.waitForSelector('button[name="continue"]');
  await page.click('button[name="continue"]');
}

async function editForm(page) {
  await page.waitForNavigation();
  const editButtonSelector = 'button[name="defaultActionPanel_0_1"]';
  const editButton = await page.$(editButtonSelector);
  if (!editButton) {
    return;
  }
  await editButton.click();
  await page.waitForNavigation();
}

async function sendMessage(message) {
  const now = new Date();
  const timeString = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  await Promise.all(
    accounts.map(async (acc) => {
      try {
        const token = acc.token;
        const bot = new TelegramBot(token, { polling: true });
        await bot.sendMessage(acc.id, message);
      } catch {
        sendMessage(message);
      }
    })
  );
  console.log(`'${timeString}: Tin đã gửi: ${message}'`);
}

async function processPages(page) {
  try {
    const maxPage = 5;
    let i = 0;
    let errorSection;
    while (i < maxPage) {
      // errorSection = await page.$("section.wc-messagebox-type-error");
      // if (errorSection) {
      //   await sendMessage(process.env.FAIL_MES);
      //   break;
      // }

      await page.waitForSelector('button[title="Go to next page"]');
      const nextButton = await page.$('button[title="Go to next page"]');
      await Promise.all([nextButton.click(), page.waitForNavigation()]);
      i++;
    }

    if (!errorSection) {
      await sendMessage(process.env.SUCCESS_MES);
      await processPages(page);
    }
  } catch (e) {
    processPages(page)
  }
}

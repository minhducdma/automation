require("dotenv").config();
const accounts = require("./accounts");
const puppeteer = require("puppeteer");
const TelegramBot = require("node-telegram-bot-api");

(() => {
  run();
})();

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();
  await page.setDefaultTimeout(Number(process.env.TIMEOUT) * 1000);

  console.log("Ứng dụng đã bắt đầu chạy");

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
  console.log("Đã đăng nhập thành công");
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
    console.log("Không có đơn nào đang nộp");
    return;
  }
  await editButton.click();
  console.log("Đã truy cập vào trang sửa đơn");
  await page.waitForNavigation();
}

async function sendMessage(message) {
  await Promise.all(
    accounts.map(async (acc) => {
      try {
        const token = acc.token;
        const bot = new TelegramBot(token, { polling: true });
        await bot.sendMessage(acc.id, message);
      } catch(e) {
        console.log(e)
        console.log("Lỗi gửi tin đến " + acc.id);
      }
    })
  );
}

async function processPages(page) {
  try {
    const maxPage = 5;
    for (let i = 0; i < maxPage; i++) {
      if (i < 5) {
        const errorSection = await page.$("section.wc-messagebox-type-error");
        if (errorSection) {
          console.log(process.env.FAIL_MES);
          console.log("Đang gửi tin nhắn tới những người liên quan");
          await sendMessage(process.env.FAIL_MES);
          console.log("Đã gửi tin nhắn thành công");
          break;
        }
      } else {
        console.log(process.env.SUCCESS_MES);
        console.log("Đang gửi tin nhắn tới những người liên quan");
        await sendMessage(process.env.SUCCESS_MES);
        await run()
        console.log("Đã gửi tin nhắn thành công");
      }

      await page.waitForSelector('button[title="Go to next page"]');
      const nextButton = await page.$('button[title="Go to next page"]');
      await Promise.all([nextButton.click(), page.waitForNavigation()]);
      console.log(`Đã chuyển đến trang ${i + 1}`);
    }
  } catch (e) {
    console.log("Đã phát hiện lỗi " + e);
  }
}


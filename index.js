#!/usr/bin/env node

const tool = require('command-line-tool')
const puppeteer = require('puppeteer');
const path = require('path')
const fs = require('fs');

// Overcast's allowed audio types
const allowedExtensions = ['mp3', 'm4a', 'm4b', 'aac']
// timeout for uploading a file
const timeoutMin = 30 // minutes

// login to Overcast
const login = async (browser, username, password) => {
    const page = await browser.newPage();

    await page.goto('https://overcast.fm/login');

    // type in email
    await page.type('#email', username)

    // type in password
    await page.type('#password', password)

    // click login
    await page.click('button.ocborderedbutton')

    // wait till loaded
    return page.waitForNavigation()
}

// get the files we need to upload
const readRelativeFilePaths = uploadDir => {

    // get the relative path for our upload directory
    const absolutePath = path.join(__dirname, uploadDir)
    const cwd = process.cwd()
    const relativeUploadPath = path.relative(cwd, absolutePath)

    // return the relative paths of the files we need to upload
    return fs.readdirSync(relativeUploadPath)
        .map(fileName => path.join(relativeUploadPath, fileName))
}

// uploads a single file
const uploadFile = async (filePath, page) => {
    // start uploading the file
    const inputSelector = 'input#upload_file'
    const input = await page.$(inputSelector)
    await input.uploadFile(filePath) //

    return page.waitForFunction(selector => {
            const input = document.querySelector(selector)
            return !!input && !input.disabled
        }, {
            // wait till the upload button is enabled
            timeout: timeoutMin * 60 * 1000 // half an hour in miliseconds
        }, inputSelector)
        .catch(() => {
            const msg = `Upload of ${filePath} exceeded ${timeoutMin}min`
            console.error(`Error: ${msg}`)
        })
}

// uploads all our files
const uploadFiles = async (browser, uploadDir) => {
    const page = await browser.newPage()

    await page.goto('https://overcast.fm/uploads')

    // upload all the files
    const filePaths = readRelativeFilePaths(uploadDir)
        .filter(filePath => allowedExtensions
            .map(ext => filePath.endsWith(`.${ext}`))
            .reduce((last, next) => last || next)
        )

    for (filePath of filePaths) {
        process.stdout.write(`uploading: '${filePath}'...`)
        await uploadFile(filePath, page)
        console.log(`done`)
    }
}

const getCommandLineOptions = optionNames => {

    const definitions = optionNames
        .map(x => ({
            name: x
        }));

    // parse options
    const {
        options
    } = tool.getCli(definitions);

    // validate
    optionNames.forEach(key => {
        if (!options[key])
            throw new Error(`Missing argument '${key}'`)
    })

    return options
}

// the main logic
const main = async () => {

    const optionNames = ['username', 'password', 'directory']
    const options = getCommandLineOptions(optionNames)

    const browser = await puppeteer.launch({
        headless: true
    });

    console.log('Logging in')
    await login(browser, options.username, options.password)
    console.log('Logged in')
    console.log('Starting uploads')
    await uploadFiles(browser, options.directory)
    console.log('Finished uploads')
    await browser.close()
};

main()
#!/usr/bin/env node

const yargs = require('yargs')
const { hideBin } = require('yargs/helpers')
const concurrently = require('concurrently')
const path = require("path")
const fs = require('fs').promises
const fg = require("fast-glob")
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const spawn = util.promisify(require("child_process").spawn)
const parseChangelog = require('changelog-parser')
const awaitSpawn = require("./scripts/await-spawn")
const chalk = require("chalk")
const gluleInitialTemplates = require("./scripts/init-glue-templates")

const info = chalk.blueBright
const warn = chalk.yellow
const error = chalk.red
const success = chalk.green
const log = console.log

const cleanCompiledFiles = async function () {
    const entries =
        await fg([
            "src/**/*.fs.js",
            "src/**/*.fs.js.map",
            "tests/**/*.fs.js",
            "tests/**/*.fs.js.map"
        ]);

    // Delete all the files generated by Fable
    for (const entry of entries) {
        await fs.unlink(entry)
    }

    // Delete .fable cache folders
    const fableCacheFolders =
        await fg([
            "src/**/.fable",
            "tests/**/.fable",
            "src/**/obj",
            "src/**/bin",
            "tests/**/obj",
            "tests/**/bin",
        ], {
            onlyDirectories: true,
            markDirectories: true
        })

    for (const fableCacheFolder of fableCacheFolders) {
        await fs.rm(fableCacheFolder, { recursive: true, force: true })
    }
}

const getEnvVariable = function (varName) {
    const value = process.env[varName];
    if (value === undefined) {
        log(error(`Missing environnement variable ${varName}`))
        process.exit(1)
    } else {
        return value;
    }
}

const SRC_DIR = path.resolve(__dirname, "src")
const SRC_FSPROJ = path.resolve(__dirname, "src/Form.Experimentation.fsproj")
const TEST_DIR = path.resolve(__dirname, "tests")
const TEST_FSPROJ = path.resolve(__dirname, "tests/Tests.fsproj")

const runTestsInWatchMode = async (project) => {

    await concurrently(
        [
            {
                // We use nodemon watcher because we can make it watch .js file only it avoids a lot of noise in the output
                command: `nodemon --inspect --watch ${TEST_DIR} --exec "npx mocha -r esm -r tests/mocha.env.js --reporter dot --recursive ${TEST_DIR}"`,
            },
            {
                // There is a bug in concurrently where cwd in command options is not taken into account
                // Waiting for https://github.com/kimmobrunfeldt/concurrently/pull/266 to merge
                command: `cd ${TEST_DIR} && dotnet fable --watch -s`,
                cwd: TEST_DIR
            }
        ],
        {
            prefix: "none" // Disable name prefix
        }
    )
}

// const runTestForAProject = async (project) => {
//     const projectFsprojPath = await findProjectFsproj(project)
//     const testFsprojPath = await findOptionalSingleFile(`glues/${project}/tests/*.fsproj`, `glues/${project}/tests`)

//     log(info("=================="))
//     log(info(`Begin testing ${project}`))

//     // If there is no tests project, we compile the glues definition to make sure everything is ok in the project
//     if (testFsprojPath === null) {
//         log(`No tests project found for ${project}, testing the bindings using 'dotnet buil'`)
//         try {
//             await awaitSpawn(
//                 "dotnet",
//                 `build ${projectFsprojPath}`.split(" "),
//                 {
//                     stdio: "inherit",
//                     shell: true
//                 }
//             )
//         } catch (e) {
//             log(error(`Error while compiling ${project}. Stopping here`))
//             process.exit(1)
//         }
//         log(info(`Testing ${project} done`))
//         log(info("==================\n\n"))

//         return; // Stop here
//     }

//     // Compile the tests using Fable
//     try {
//         await awaitSpawn(
//             "dotnet",
//             `fable ${testFsprojPath}`.split(" "),
//             {
//                 stdio: "inherit",
//                 shell: true
//             }
//         )

//         // Run the tests using mocha
//         await awaitSpawn(
//             "npx",
//             `mocha -r esm -r tests-shared/mocha.env.js --reporter dot --reporter dot --recursive glues/${project}/tests`.split(" "),
//             {
//                 stdio: "inherit",
//                 shell: true,
//             }
//         )
//     } catch (e) {
//         log(error(`Error while compiling or running the tests for ${project}. Stopping here`))
//         process.exit(1)
//     }

//     log(info(`Testing ${project} done`))
//     log(info("==================\n\n"))
// }

const testRunner = async (argv) => {
    await cleanCompiledFiles()

    if (argv.watch) {
        // Compile and test in watch mode
        await runTestsInWatchMode()

    } else {
        // Compile and test once then exit
        // if (argv.project !== undefined) {
        //     const project =
        //         projects.find((p) => {
        //             return p.toLocaleLowerCase() === argv.project.toLocaleLowerCase()
        //         })

        //     if (project === undefined) {
        //         log(error(`Project '${argv.project}' not found. If you just created it, please make sure to add it to the projects list in build.js file`))
        //         process.exit(1)
        //     }

        //     await runTestForAProject(project)

        // } else {
        //     for (const project of projects) {
        //         await runTestForAProject(project)
        //     }
        // }
        throw "Not supported yet"

    }
}

const publishHandler = async () => {
    throw "Not supported yet"

    // // Check if all the required env variables are defined
    // const NUGET_KEY = getEnvVariable("NUGET_KEY")

    // // 1. Remove Fable compiled files
    // await cleanCompiledFiles()

    // for (const project of projects) {
    //     await runTestForAProject(project)

    //     const projectFsproj = await findProjectFsproj(project)

    //     const changelogPath = await findProjectChangelog(project)

    //     const fsprojContent = (await fs.readFile(projectFsproj)).toString()

    //     // Normalize the new lines otherwise parseChangelog isn't able to parse the file correctly
    //     const changelogContent = (await fs.readFile(changelogPath)).toString().replace("\r\n", "\n")
    //     const changelog = await parseChangelog({ text: changelogContent })

    //     // Check if the changelog has at least 2 versions in it
    //     // Unreleased & X.Y.Z
    //     if (changelog.versions.length < 2) {
    //         log(error(`No version to publish for ${project}`))
    //         process.exit(1)
    //     }

    //     const unreleased = changelog.versions[0];

    //     // Check malformed changelog
    //     if (unreleased.title !== "Unreleased") {
    //         log(error(`Malformed CHANGELOG.md file in ${project}`))
    //         log(error("The changelog should first version should be 'Unreleased'"))
    //         process.exit(1)
    //     }

    //     // Access via index is ok we checked the length before
    //     const newVersion = changelog.versions[1].version;

    //     if (newVersion.version === null) {
    //         log(error(`Malformed CHANGELOG.md file in ${project}`))
    //         log(error("Please verify the last version format, it should be SEMVER compliant"))
    //         process.exit(1)
    //     }

    //     const fsprojVersionRegex = /<Version>(.*)<\/Version>/gmi

    //     const m = fsprojVersionRegex.exec(fsprojContent)

    //     if (m === null) {
    //         log(error(`Missing <Version>..</Version> tag in ${projectFsproj}`))
    //         process.exit(1)
    //     }

    //     const lastPublishedVersion = m[1];

    //     if (lastPublishedVersion === newVersion) {
    //         log(`Version ${lastPublishedVersion} of ${project}, has already been published. Skipping this project`)
    //         continue;
    //     }

    //     log(`New version detected for ${project}, starting publish process for it`)

    //     const newFsprojContent = fsprojContent.replace(fsprojVersionRegex, `<Version>${newVersion}</Version>`)

    //     // Start a try-catch here, because we modfied the file on the disk
    //     // This allows to revert the changes made to the file is something goes wrong
    //     try {
    //         // Update fsproj file on the disk
    //         await fs.writeFile(projectFsproj, newFsprojContent)

    //         await awaitSpawn(
    //             "dotnet",
    //             `pack -c Release ${projectFsproj}`.split(' '),
    //             {
    //                 stdio: "inherit",
    //                 shell: true
    //             }
    //         )

    //         const nugetPackagePath = await findRequiredSingleFile(`glues/${project}/src/bin/Release/*${newVersion}.nupkg`)

    //         await awaitSpawn(
    //             "dotnet",
    //             `nuget push -s nuget.org -k ${NUGET_KEY} ${nugetPackagePath}`.split(' '),
    //             {
    //                 stdio: "inherit",
    //                 shell: true
    //             }
    //         )

    //         log(success(`Project ${project} has been published`))

    //     } catch (e) {
    //         log(error(`Something went wrong while publish ${project}`))
    //         log("Reverting changes made to the files")
    //         await fs.writeFile(projectFsproj, fsprojContent)
    //         log("Revert done")
    //         process.exit(1)
    //     }

    // }
}

yargs(hideBin(process.argv))
    .completion()
    .strict()
    .help()
    .alias("help", "h")
    .command(
        "clean",
        "Delete all the compiled or cached files from dotnet, Fable.",
        () => {},
        async () => {
            await cleanCompiledFiles()
        }
    )
    .command(
        "publish",
        `1. Clean files
        2. For each package make a fresh compilation and run tests
        3. Update the version in the fsproj using the changelog as reference
        4. Generate the packages
        5. Publish new packages on NuGet

        Note: If an error occured, after updating the version in the fsproj the process will try to revert the changes on the current fsproj file.
        `,
        () => { },
        publishHandler
    )
    .command(
        "test",
        "Run the tests",
        (argv) => {
            argv
                .option(
                    "watch",
                    {
                        description:
                            "Start Fable and Mocha in watch mode",
                        alias: "w",
                        type: "boolean",
                        default: false
                    }
                )
        },
        testRunner
    )
    .version(false)
    .argv

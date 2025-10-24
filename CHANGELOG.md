# Changelog

## [4.14.1](https://github.com/Doist/todoist-ai/compare/v4.14.0...v4.14.1) (2025-10-24)


### Bug Fixes

* Update todoist-typescript-sdk to 5.7.1 (follow-up) ([#172](https://github.com/Doist/todoist-ai/issues/172)) ([b4f8dc3](https://github.com/Doist/todoist-ai/commit/b4f8dc3ffa4c3dd7489ece03be5a0f391130a2ce))

## [4.14.0](https://github.com/Doist/todoist-ai/compare/v4.13.5...v4.14.0) (2025-10-23)


### Features

* Add find-activity tool ([#169](https://github.com/Doist/todoist-ai/issues/169)) ([1abf67f](https://github.com/Doist/todoist-ai/commit/1abf67f3a99191582cf0b5ea2516420f1278dc9a))

## [4.13.5](https://github.com/Doist/todoist-ai/compare/v4.13.4...v4.13.5) (2025-10-23)


### Bug Fixes

* clarify find-completed-tasks scope ([#167](https://github.com/Doist/todoist-ai/issues/167)) ([f110669](https://github.com/Doist/todoist-ai/commit/f11066934d4f6b790599d0f89db416a32437edd3))

## [4.13.4](https://github.com/Doist/todoist-ai/compare/v4.13.3...v4.13.4) (2025-10-23)


### Bug Fixes

* Test publish workflow (no functional changes) ([#164](https://github.com/Doist/todoist-ai/issues/164)) ([68afb4c](https://github.com/Doist/todoist-ai/commit/68afb4ce06366cc022a1718e6cd0c3525c5aab48))

## [4.13.3](https://github.com/Doist/todoist-ai/compare/v4.13.2...v4.13.3) (2025-10-23)


### Bug Fixes

* Switch to using `moveTask` instead of `moveTasks` ([#160](https://github.com/Doist/todoist-ai/issues/160)) ([34e3fc6](https://github.com/Doist/todoist-ai/commit/34e3fc67922379bf0aef39a9e7f1939ded5f0e08))

## [4.13.2](https://github.com/Doist/todoist-ai/compare/v4.13.1...v4.13.2) (2025-10-22)


### Bug Fixes

* Output `checked` for the `fetch` tool ([#158](https://github.com/Doist/todoist-ai/issues/158)) ([f0a6eaf](https://github.com/Doist/todoist-ai/commit/f0a6eaf62a915cfab289f1b5181770ccd11d0bdb))

## [4.13.1](https://github.com/Doist/todoist-ai/compare/v4.13.0...v4.13.1) (2025-10-22)


### Bug Fixes

* Remove `updatedAt` ([#155](https://github.com/Doist/todoist-ai/issues/155)) ([3f3f345](https://github.com/Doist/todoist-ai/commit/3f3f3458f9d54f4f347dfb7c34892fb3cda7ff3b))

## [4.13.0](https://github.com/Doist/todoist-ai/compare/v4.12.0...v4.13.0) (2025-10-21)


### Features

* Expose completion and modification metadata in task mapping ([#153](https://github.com/Doist/todoist-ai/issues/153)) ([1e2d3b3](https://github.com/Doist/todoist-ai/commit/1e2d3b3f461e75be8cc63ae3a4e070d113f5c4da))
* extend responsibleUser filtering to more tools ([#149](https://github.com/Doist/todoist-ai/issues/149)) ([c146d74](https://github.com/Doist/todoist-ai/commit/c146d749eb097e1d383dda00e6a09e05389969dd))

## [4.12.0](https://github.com/Doist/todoist-ai/compare/v4.11.0...v4.12.0) (2025-10-14)


### Features

* In find-tasks-by-date use backend filtering for responsible user ([#145](https://github.com/Doist/todoist-ai/issues/145)) ([5d1e140](https://github.com/Doist/todoist-ai/commit/5d1e1400f639e8c802019421eb0437ef39c67a64))

## [4.11.0](https://github.com/Doist/todoist-ai/compare/v4.10.0...v4.11.0) (2025-10-13)


### Features

* Improve findCompletedTasks to handle user timezones ([#143](https://github.com/Doist/todoist-ai/issues/143)) ([c27d897](https://github.com/Doist/todoist-ai/commit/c27d8973d0ea9342f8b1e56659fca900f920ddb3))

## [4.10.0](https://github.com/Doist/todoist-ai/compare/v4.9.4...v4.10.0) (2025-10-10)


### Features

* add OpenAI-compliant `search` and `fetch` tools ([#134](https://github.com/Doist/todoist-ai/issues/134)) ([153289c](https://github.com/Doist/todoist-ai/commit/153289c5cf02b2da6b3f4cf6e8a7c681b3ee3aec))
* Clarify content vs description usage and Markdown support ([#139](https://github.com/Doist/todoist-ai/issues/139)) ([cb410a2](https://github.com/Doist/todoist-ai/commit/cb410a2c16670ec07ee2d812ba961075c3f20dda))

## [4.9.4](https://github.com/Doist/todoist-ai/compare/v4.9.3...v4.9.4) (2025-10-06)


### Bug Fixes

* Ensures null fields are not returned ([#130](https://github.com/Doist/todoist-ai/issues/130)) ([a016011](https://github.com/Doist/todoist-ai/commit/a0160115b6fff4b96751056506494e43f582527c))

## [4.9.3](https://github.com/Doist/todoist-ai/compare/v4.9.2...v4.9.3) (2025-10-02)


### Bug Fixes

* dayCount and overdue only fixes ([#128](https://github.com/Doist/todoist-ai/issues/128)) ([d020c06](https://github.com/Doist/todoist-ai/commit/d020c0622fb5c9a71b5f666406529236db76bdef))

## [4.9.2](https://github.com/Doist/todoist-ai/compare/v4.9.1...v4.9.2) (2025-10-02)


### Bug Fixes

* allow add-tasks to work with only content parameter ([#126](https://github.com/Doist/todoist-ai/issues/126)) ([27bda34](https://github.com/Doist/todoist-ai/commit/27bda346f465a1a2ab7a0ab833c151093a4d7044))

## [4.9.1](https://github.com/Doist/todoist-ai/compare/v4.9.0...v4.9.1) (2025-10-01)


### Bug Fixes

* Enhance task filtering by responsible user and update related tools ([#121](https://github.com/Doist/todoist-ai/issues/121)) ([cea0917](https://github.com/Doist/todoist-ai/commit/cea0917a8b2bd1f056e1b08f14e9cb858b9711a5))
* preserve markdown in tasks content and description ([#124](https://github.com/Doist/todoist-ai/issues/124)) ([0cc48fe](https://github.com/Doist/todoist-ai/commit/0cc48fe93595213729d794b7b6c92d54072cf6d5))

## [4.9.0](https://github.com/Doist/todoist-ai/compare/v4.8.0...v4.9.0) (2025-09-30)


### Features

* add parentId support to add-projects tool ([#122](https://github.com/Doist/todoist-ai/issues/122)) ([84019d1](https://github.com/Doist/todoist-ai/commit/84019d1403fff67d33de5bf756a40da28b88171e))

## [4.8.0](https://github.com/Doist/todoist-ai/compare/v4.7.1...v4.8.0) (2025-09-29)


### Features

* merge overdue into today's tasks in find-tasks-by-date tool ([#108](https://github.com/Doist/todoist-ai/issues/108)) ([f86e69d](https://github.com/Doist/todoist-ai/commit/f86e69d3ac4861a1b99ebdc8f25f135c6d6adeeb))

## [4.7.1](https://github.com/Doist/todoist-ai/compare/v4.7.0...v4.7.1) (2025-09-29)


### Bug Fixes

* Convert the API priorities into a consumable priority ([#115](https://github.com/Doist/todoist-ai/issues/115)) ([e4cc62f](https://github.com/Doist/todoist-ai/commit/e4cc62f5e456c517995aaf9b8e22153923a55ff7))

## [4.7.0](https://github.com/Doist/todoist-ai/compare/v4.6.1...v4.7.0) (2025-09-25)


### Features

* Document the MCP setup better, including the remote endpoint ([#109](https://github.com/Doist/todoist-ai/issues/109)) ([e1e69e2](https://github.com/Doist/todoist-ai/commit/e1e69e27e91675775e7f4ea0bef709a17722131c))

## [4.6.1](https://github.com/Doist/todoist-ai/compare/v4.6.0...v4.6.1) (2025-09-24)


### Bug Fixes

* Update package.json with `mcpName` ([#106](https://github.com/Doist/todoist-ai/issues/106)) ([df19306](https://github.com/Doist/todoist-ai/commit/df19306adb13ff6416a37e4b49a6d2e5ab5c459f))

## [4.6.0](https://github.com/Doist/todoist-ai/compare/v4.5.2...v4.6.0) (2025-09-24)


### Features

* add label support for add-tasks and update-tasks tools ([#103](https://github.com/Doist/todoist-ai/issues/103)) ([a4bc708](https://github.com/Doist/todoist-ai/commit/a4bc7085b5a63402970841e586ce985cab9022d0))

## [4.5.2](https://github.com/Doist/todoist-ai/compare/v4.5.1...v4.5.2) (2025-09-24)


### Miscellaneous Chores

* Release 4.5.2 ([11df6f2](https://github.com/Doist/todoist-ai/commit/11df6f2c03e31bffd02a6c4f1a5176158e434e05))

## [4.5.1](https://github.com/Doist/todoist-ai/compare/v4.5.0...v4.5.1) (2025-09-23)


### Bug Fixes

* fix priority levels ([#98](https://github.com/Doist/todoist-ai/issues/98)) ([64db2ff](https://github.com/Doist/todoist-ai/commit/64db2ff97f3ede0c5cff14d1c58f8fed63a9d742))

## [4.5.0](https://github.com/Doist/todoist-ai/compare/v4.4.0...v4.5.0) (2025-09-11)


### Features

* add task assignment management ([#81](https://github.com/Doist/todoist-ai/issues/81)) ([b9b1691](https://github.com/Doist/todoist-ai/commit/b9b16916dec8f18efc37631d77f97354fae2194a))

## [4.4.0](https://github.com/Doist/todoist-ai/compare/v4.3.0...v4.4.0) (2025-09-10)


### Features

* Add user's id to user_info tool ([#84](https://github.com/Doist/todoist-ai/issues/84)) ([706ed8f](https://github.com/Doist/todoist-ai/commit/706ed8fdfd11199808ca9824d4c66e8211d773c1))

## [4.3.0](https://github.com/Doist/todoist-ai/compare/v4.2.0...v4.3.0) (2025-09-09)


### Features

* Add user-info tool and upgrade Todoist API ([#82](https://github.com/Doist/todoist-ai/issues/82)) ([b583fe1](https://github.com/Doist/todoist-ai/commit/b583fe1045ea38fbe25dfa804df9ebe958f2881d))

## [4.2.0](https://github.com/Doist/todoist-ai/compare/v4.1.0...v4.2.0) (2025-08-29)


### Features

* Add support for filtering by label ([#71](https://github.com/Doist/todoist-ai/issues/71)) ([b608d32](https://github.com/Doist/todoist-ai/commit/b608d32f7636a175dc62ca388892e9aef0834712))

## [4.1.0](https://github.com/Doist/todoist-ai/compare/v4.0.0...v4.1.0) (2025-08-23)


### Features

* export comment tools ([#63](https://github.com/Doist/todoist-ai/issues/63)) ([cec2999](https://github.com/Doist/todoist-ai/commit/cec2999b8ca1f660f26b37cffb3803e863f60be0))

## [4.0.0](https://github.com/Doist/todoist-ai/compare/v3.0.0...v4.0.0) (2025-08-22)


### ⚠ BREAKING CHANGES

* restructure management tools into specialized add/update tools ([#59](https://github.com/Doist/todoist-ai/issues/59))

### Features

* add comment tools ([#58](https://github.com/Doist/todoist-ai/issues/58)) ([7d6ffca](https://github.com/Doist/todoist-ai/commit/7d6ffcacd326ef755aba691436d44d6b534f6b4b))
* add todoist base url to dev setup, plus doc improvements ([#62](https://github.com/Doist/todoist-ai/issues/62)) ([e0e5a78](https://github.com/Doist/todoist-ai/commit/e0e5a78d1358b82d5f2661a41ffe193015296154))
* parallelize add-tasks with per-task context ([#60](https://github.com/Doist/todoist-ai/issues/60)) ([816d099](https://github.com/Doist/todoist-ai/commit/816d099551974bad3e0663c1d77334b692aaa76a))
* restructure management tools into specialized add/update tools ([#59](https://github.com/Doist/todoist-ai/issues/59)) ([0c4dcf7](https://github.com/Doist/todoist-ai/commit/0c4dcf7c4e420eadea15bf825599f4c3cd72cbfc))

## [3.0.0](https://github.com/Doist/todoist-ai/compare/v2.2.2...v3.0.0) (2025-08-21)


### ⚠ BREAKING CHANGES

* verb-first tool names, unify find-by-container into find-tasks ([#53](https://github.com/Doist/todoist-ai/issues/53))
* Remove single update task and replace with multiple ([#47](https://github.com/Doist/todoist-ai/issues/47))

### Features

* Improve tool output UX with LLM-readable responses ([#49](https://github.com/Doist/todoist-ai/issues/49)) ([7c25696](https://github.com/Doist/todoist-ai/commit/7c25696926bbaee158482cbc75595e80959e1c12))
* Remove single update task and replace with multiple ([#47](https://github.com/Doist/todoist-ai/issues/47)) ([8a9b7cf](https://github.com/Doist/todoist-ai/commit/8a9b7cf119a405a2849ab95c437a344961790686))
* verb-first tool names, unify find-by-container into find-tasks ([#53](https://github.com/Doist/todoist-ai/issues/53)) ([dbada71](https://github.com/Doist/todoist-ai/commit/dbada719d98df4bb91a52a0a7af8afb6ad6f3fae))

## [2.2.2](https://github.com/Doist/todoist-ai/compare/v2.2.1...v2.2.2) (2025-08-16)


### Bug Fixes

* correct bin path in package.json for npx support ([#39](https://github.com/Doist/todoist-ai/issues/39)) ([816021d](https://github.com/Doist/todoist-ai/commit/816021dc3572dd476818981388fac634794d7e21))

## [2.2.1](https://github.com/Doist/todoist-ai/compare/v2.2.0...v2.2.1) (2025-08-16)


### Bug Fixes

* correct bin field format in package.json for npx support ([#37](https://github.com/Doist/todoist-ai/issues/37)) ([a50fa75](https://github.com/Doist/todoist-ai/commit/a50fa75d737bc6f4503442830565c3d4a942c9af))

## [2.2.0](https://github.com/Doist/todoist-ai/compare/v2.1.0...v2.2.0) (2025-08-16)


### Features

* Add npx support for MCP server usage ([#33](https://github.com/Doist/todoist-ai/issues/33)) ([5ed0c5f](https://github.com/Doist/todoist-ai/commit/5ed0c5f40615ab4afb61d0fcd9796c97e666b1f9))

## [2.1.0](https://github.com/Doist/todoist-ai/compare/v2.0.1...v2.1.0) (2025-08-15)


### Features

* add support for task duration when adding or updating tasks ([#28](https://github.com/Doist/todoist-ai/issues/28)) ([a0c6702](https://github.com/Doist/todoist-ai/commit/a0c6702dd446173c86675ecadd975506ce594c42))

## [2.0.1](https://github.com/Doist/todoist-ai/compare/v2.0.0...v2.0.1) (2025-08-14)


### Bug Fixes

* convert project from CommonJS to ES modules to resolve MCP initialization ([#24](https://github.com/Doist/todoist-ai/issues/24)) ([f817e04](https://github.com/Doist/todoist-ai/commit/f817e045a711f90b4f74464a480dd1aa8f7e1027))
* resolve task move operations using correct Todoist API methods ([#22](https://github.com/Doist/todoist-ai/issues/22)) ([3b8f509](https://github.com/Doist/todoist-ai/commit/3b8f50943f517ae76b754923f7a8c5563880e9ba))

## [2.0.0](https://github.com/Doist/todoist-ai/compare/v1.1.0...v2.0.0) (2025-08-13)


### ⚠ BREAKING CHANGES

* Consolidate MCP tools to reduce tool count ([#14](https://github.com/Doist/todoist-ai/issues/14))

### Features

* Consolidate MCP tools to reduce tool count ([#14](https://github.com/Doist/todoist-ai/issues/14)) ([f0ccdf8](https://github.com/Doist/todoist-ai/commit/f0ccdf8fd17f046fdb8d0938dea94163fd916a7c))


### Bug Fixes

* update release-please action to googleapis/release-please-action@v4 ([7fbb5fd](https://github.com/Doist/todoist-ai/commit/7fbb5fdd3f435e68a9b2ba054247d29e82fcc465))

## [1.1.0](https://github.com/Doist/todoist-ai/compare/v1.0.0...v1.1.0) (2025-08-13)


### Features

* Adds completed tasks tool ([#8](https://github.com/Doist/todoist-ai/issues/8)) ([d0ffad1](https://github.com/Doist/todoist-ai/commit/d0ffad10a331c16f14b4d738ed7ac368fd8e44b4))


### Bug Fixes

* add issues permission for release-please workflow ([0974fa4](https://github.com/Doist/todoist-ai/commit/0974fa45aa8578eafd2e9e1355a997ee09dce391))

## 1.0.0 (2025-08-12)


### Features

* add tasks-add-multiple and tasks-update-one tools ([f7432e7](https://github.com/Doist/todoist-ai/commit/f7432e7f8c4121ed2bf71b424fe17d03e59aed23))
* add tasks-complete-one and tasks-delete-one tools ([1ef6a99](https://github.com/Doist/todoist-ai/commit/1ef6a99e2733226d85932b930a41dc9ff92d0ef9))
* allow configuring the base URL for the Todoist API ([332c11a](https://github.com/Doist/todoist-ai/commit/332c11aec34ace9890fda36ef9356a7c417b22d1))
* allow configuring the base URL for the Todoist API ([c56b3a3](https://github.com/Doist/todoist-ai/commit/c56b3a36207fb211188737f05f472ebcee6e7fc5))

## [0.1.4](https://github.com/doist/todoist-ai/compare/v0.1.3...v0.1.4) (2025-01-XX)

### Features

* allow configuring the base URL for the Todoist API ([332c11a](https://github.com/doist/todoist-ai/commit/332c11a))

### Bug Fixes

* remove esm build, use single tsconfig for cjs ([24a1336](https://github.com/doist/todoist-ai/commit/24a1336))
* remove tools subpath, export tools from index.ts ([2e13489](https://github.com/doist/todoist-ai/commit/2e13489))

### Miscellaneous Chores

* rename tool files to match the tool name ([997780a](https://github.com/doist/todoist-ai/commit/997780a))

---

*Note: This changelog will be automatically maintained by [release-please](https://github.com/googleapis/release-please) starting from the next release.*

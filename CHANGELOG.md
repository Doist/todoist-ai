# Changelog

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

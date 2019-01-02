# Overcast Uploader

## Installation

Clone and run `npm install` and then `npm link`.

## Usage

Note, we assume the happy path: valid login info, no server issues, and known page structure.

```shell
overcast-uploader --email <email> --password <password> <file> [otherFiles...]
```

## Todo

-   [ ] Use the actual request instead of browser automation.
-   [ ] publish to `npm`

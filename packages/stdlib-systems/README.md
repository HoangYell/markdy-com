# @markdy/stdlib-systems

System actor/action pack for Markdy.

```ts
import { registerActorPack } from "@markdy/core";
import { systemsPack } from "@markdy/stdlib-systems";

registerActorPack(systemsPack);
```

Adds actor types:
- `service`
- `db`
- `queue`
- `client`

Adds actions:
- `.request(to=..., label=..., dur=...)`
- `.response(to=..., label=..., dur=...)`
- `.emit(to=..., label=..., dur=...)`

## Package position (text)

```text
@markdy/stdlib-systems -> registerActorPack(...) -> @markdy/core

Adds reusable system actors/actions without changing core parser internals.
```

## Output preview

<p align="center">
	<img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-output-preview.webp" alt="Markdy output preview" width="900" />
</p>

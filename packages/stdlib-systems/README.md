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

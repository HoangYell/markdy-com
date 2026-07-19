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

## Visual guide

<p align="center">
	<img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-tooling-map.webp" alt="Markdy tooling and system pack visual" width="900" />
</p>

## Love Story result

<p align="center">
	<img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-love-story-result.webp" alt="Love Story main Markdy result" width="900" />
</p>

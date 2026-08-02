# @markdy/stdlib-systems

System actor/action pack for Markdy.

```ts
import { registerActorPack } from "@markdy/core";
import { systemsPack } from "@markdy/stdlib-systems";

registerActorPack(systemsPack);
```

Adds actor types:

Architecture / technical nodes:
- Compute/backend: `service`, `api`, `microservice`, `backend`, `server`, `worker`, `job`, `scheduler`, `cron`, `batch`, `function`, `lambda`, `edge`, `controller`, `handler`, `repository`, `runtime`, `process`
- Frontend/client: `client`, `user`, `browser`, `web`, `mobile`, `desktop`, `frontend`, `app`, `page`, `view`, `component`, `store`
- Data/storage: `db`, `database`, `sql`, `nosql`, `table`, `index`, `warehouse`, `lake`, `object_store`, `bucket`, `blob`, `volume`, `disk`, `search`, `cache`
- Messaging/events: `queue`, `topic`, `stream`, `event`, `event_bus`, `bus`, `broker`, `pubsub`, `kafka`, `producer`, `consumer`, `dead_letter`, `dlq`, `webhook`
- Network/cloud: `cloud`, `region`, `vpc`, `subnet`, `network`, `internet`, `dns`, `cdn`, `proxy`, `gateway`, `api_gateway`, `load_balancer`, `reverse_proxy`, `router`, `switch`, `nat`, `firewall`, `waf`, `vpn`, `bastion`
- Platform/Kubernetes/Docker: `container`, `cluster`, `pod`, `node`, `deployment`, `replicaset`, `statefulset`, `daemonset`, `namespace`, `ingress`, `service_mesh`, `sidecar`, `image`, `registry`, `docker`, `compose`, `helm`, `chart`, `configmap`, `pvc`
- Security/IAM: `auth`, `identity`, `oauth`, `oidc`, `jwt`, `session`, `policy`, `role`, `permission`, `vault`, `secret`, `key`, `certificate`
- CI/CD: `repo`, `branch`, `commit`, `pipeline`, `workflow`, `runner`, `build`, `test`, `artifact`, `deploy`, `release`, `environment`, `preview`
- Observability: `monitor`, `metrics`, `logs`, `trace`, `alert`, `dashboard`, `probe`, `slo`
- Flow/state/sequence: `start`, `end`, `state`, `decision`, `condition`, `step`, `loop`, `sequence`, `participant`
- Distributed systems: `replica`, `shard`, `leader`, `follower`, `quorum`, `consensus`, `lock`
- Programming concepts: `class`, `interface`, `method`, `object`, `enum`, `type`, `module`, `package`, `library`, `sdk`, `cli`

Generic visual primitives:
- `surface` (`panel` alias)
- `terminal`
- `stat` (`metric` alias)
- `matrix` (`grid` alias)
- `track` (`lane` alias)
- `dot` (`marker` alias)
- `chips` (`token_strip` alias)
- `glyph` (`glyph_card` alias)

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

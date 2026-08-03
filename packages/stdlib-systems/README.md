# @markdy/stdlib-systems

The system-diagram vocabulary for MarkdyScript.

As of MarkdyScript 0.8 the node vocabulary ships inside `@markdy/core`, so there
is **no registration step** — every node kind below is available out of the box.
This package re-exports that vocabulary and a `systemsPack` manifest for tooling
that wants a single import listing every supported node type and flow action.

```ts
import { systemsPack, SYSTEM_NODE_TYPES, SYSTEM_FLOW_ACTIONS } from "@markdy/stdlib-systems";

systemsPack.nodes;    // every supported node type
systemsPack.actions;  // ["request", "response", "event", "dependency"]
```

Node types:

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

Flow operators (from `@markdy/core`):
- `->` request
- `<-` response
- `~>` event
- `--` dependency

## Package position (text)

```text
@markdy/stdlib-systems re-exports the node vocabulary from @markdy/core

The vocabulary is built into the core parser — this package is a convenience
re-export and manifest, not a runtime registration step.
```

## Output preview

<p align="center">
	<img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-output-preview.webp" alt="Markdy output preview" width="900" />
</p>

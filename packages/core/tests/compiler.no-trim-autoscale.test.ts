import { describe, it, expect } from "vitest";
import { parse, compile, computeNodeDimensions } from "../src/index.js";

describe("Diagram Node Auto-Scaling & No-Trim Verification", () => {
  it("preserves standard 180x76 baseline for normal short labels", () => {
    const node = {
      id: "srv",
      kind: "service",
      label: "API Gateway",
      props: {},
      line: 1,
    };
    const dims = computeNodeDimensions(node);
    expect(dims.width).toBe(180);
    expect(dims.height).toBe(76);
  });

  it("auto-scales card dimensions when label has long Vietnamese text without trimming", () => {
    const node = {
      id: "srv_vn",
      kind: "service",
      label: "Hệ thống quản lý dữ liệu giao dịch thanh toán tự động thời gian thực phân tán đa vùng",
      props: {},
      line: 1,
    };
    const dims = computeNodeDimensions(node);
    // Should scale width and height beyond standard 180x76
    expect(dims.width).toBeGreaterThan(180);
    expect(dims.height).toBeGreaterThan(76);
    expect(dims.width % 4).toBe(0);
    expect(dims.height % 4).toBe(0);
  });

  it("expands card width for long unbroken words so text never overflows", () => {
    const longWord = "SupercalifragilisticexpialidociousLongWordIdentifier";
    const node = {
      id: "w1",
      kind: "service",
      label: longWord,
      props: {},
      line: 1,
    };
    const dims = computeNodeDimensions(node);
    expect(dims.width).toBeGreaterThanOrEqual(longWord.length * 8 + 36);
  });

  it("auto-scales diamond dimensions geometrically to keep text inside diamond boundaries", () => {
    const node = {
      id: "dec1",
      kind: "decision",
      label: "Kiểm tra tính hợp lệ của chữ ký số và phân quyền người dùng trong hệ thống",
      props: {},
      line: 1,
    };
    const dims = computeNodeDimensions(node);
    // Diamond must scale significantly to contain multi-line text inside the diamond inscribed area
    expect(dims.width).toBeGreaterThanOrEqual(200);
    expect(dims.height).toBeGreaterThanOrEqual(120);
  });

  it("auto-scales circle shapes with equal width and height fitting circumscribed bounds", () => {
    const node = {
      id: "c1",
      kind: "service",
      label: "Bộ nhớ đệm Redis phân tán cụm đa nút",
      props: { shape: "circle" },
      line: 1,
    };
    const dims = computeNodeDimensions(node);
    expect(dims.width).toBe(dims.height);
    expect(dims.width).toBeGreaterThanOrEqual(140);
  });

  it("auto-scales pill shapes with appropriate padding for rounded ends", () => {
    const node = {
      id: "p1",
      kind: "service",
      label: "Tiến trình đồng bộ dữ liệu người dùng ngoại tuyến",
      props: { shape: "pill" },
      line: 1,
    };
    const dims = computeNodeDimensions(node);
    expect(dims.width).toBeGreaterThan(200);
    expect(dims.height).toBeGreaterThanOrEqual(56);
  });

  it("auto-scales node height and width when tech badges and metrics are present", () => {
    const node = {
      id: "srv_tech",
      kind: "service",
      label: "Xử lý thông điệp và chuẩn hóa giao dịch phân tán thời gian thực",
      props: {
        tech: "Apache Kafka + Apache Flink + Schema Registry",
        metric: "99.999% SLA",
      },
      line: 1,
    };
    const dims = computeNodeDimensions(node);
    expect(dims.width).toBeGreaterThanOrEqual(240);
    expect(dims.height).toBeGreaterThanOrEqual(88);
  });

  it("applies auto-scaled dimensions across ranked layout nodes", () => {
    const script = `
scene "Auto Scale Architecture" theme=midnight layout LR
service Gateway "Cổng kết nối API Gateway phân tán cân bằng tải" tech="Kong API Gateway Enterprise"
service Core "Hệ thống xử lý nghiệp vụ thanh toán điện tử thời gian thực" tech="Go Microservices gRPC"
database DB "Cơ sở dữ liệu giao dịch tài chính phân tán PostgreSQL" tech="PostgreSQL Citus Cluster"

beat main:
  Gateway -> Core -> DB
`;
    const ast = parse(script);
    const plan = compile(ast);

    for (const node of plan.nodes) {
      expect(node.width).toBeGreaterThan(180);
      expect(node.height).toBeGreaterThan(76);
    }
  });

  it("applies auto-scaled dimensions in tree diagram without clipping", () => {
    const script = `
scene "Hệ thống phân cấp" theme=paper type=tree
service Root "Tổng công ty phát triển giải pháp phần mềm và hạ tầng đám mây toàn cầu"
service C1 "Khối nghiên cứu và phát triển công nghệ trí tuệ nhân tạo thế hệ mới"
service C2 "Khối an ninh mạng và bảo mật thông tin toàn diện doanh nghiệp cấp cao"

beat main:
  Root -> C1 & Root -> C2
`;
    const ast = parse(script);
    const plan = compile(ast);

    for (const node of plan.nodes) {
      expect(node.width).toBeGreaterThan(180);
      expect(node.height).toBeGreaterThan(76);
    }

    // Ensure child nodes do not overlap horizontally
    const nodeC1 = plan.nodes.find((n) => n.id === "C1")!;
    const nodeC2 = plan.nodes.find((n) => n.id === "C2")!;
    expect(nodeC1.x + nodeC1.width).toBeLessThanOrEqual(nodeC2.x + 16);
  });

  it("applies auto-scaled dimensions in swimlane diagram without clipping", () => {
    const script = `
scene "Quy trình xử lý đơn hàng" theme=editorial type=swimlane
service UI "Giao diện khách hàng đặt hàng trực tuyến trên thiết bị di động thông minh"
service Pay "Hệ thống xác thực thẻ thanh toán quốc tế bảo mật cao 3D-Secure thế hệ mới"

group web: UI
group banking: Pay

beat main:
  show $nodes
`;
    const ast = parse(script);
    const plan = compile(ast);

    const uiNode = plan.nodes.find((n) => n.id === "UI")!;
    const payNode = plan.nodes.find((n) => n.id === "Pay")!;
    expect(uiNode.width).toBeGreaterThan(180);
    expect(uiNode.height).toBeGreaterThan(76);
    expect(payNode.width).toBeGreaterThan(180);
    expect(payNode.height).toBeGreaterThan(76);
  });

  it("applies auto-scaled dimensions in medallion architecture", () => {
    const script = `
scene "Data Lakehouse" theme=midnight type=medallion
service raw_bronze "Dữ liệu thô thu thập liên tục từ hàng triệu thiết bị IoT và nhật ký máy chủ"
service clean_silver "Dữ liệu đã chuẩn hóa làm sạch khử trùng lặp và kiểm tra toàn vẹn tự động"
service mart_gold "Báo cáo phân tích tổng hợp phục vụ kinh doanh và dự báo thị trường thời gian thực"

beat main:
  raw_bronze -> clean_silver -> mart_gold
`;
    const ast = parse(script);
    const plan = compile(ast);

    for (const node of plan.nodes) {
      expect(node.width).toBeGreaterThan(180);
      expect(node.height).toBeGreaterThan(76);
    }
  });

  it("applies auto-scaled dimensions in loop topology", () => {
    const script = `
scene "Vòng đời phản hồi" theme=paper type=loop
service N1 "Thu thập phản hồi và ý kiến đóng góp liên tục của toàn bộ khách hàng trên các kênh"
service N2 "Phân tích tâm lý và phân loại yêu cầu tự động bằng mô hình trí tuệ nhân tạo"
service N3 "Triển khai cải tiến sản phẩm liên tục và cập nhật các tính năng mới cho người dùng"

beat cycle:
  N1 -> N2 -> N3 -> N1
`;
    const ast = parse(script);
    const plan = compile(ast);

    for (const node of plan.nodes) {
      expect(node.width).toBeGreaterThan(180);
      expect(node.height).toBeGreaterThan(76);
    }
  });
});

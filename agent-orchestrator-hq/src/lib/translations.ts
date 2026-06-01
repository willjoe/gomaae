export const translations: Record<string, any> = {
  English: {
    // General
    stages: 'Development Stages',
    viewers: 'System Viewers',
    settings: 'Settings',
    back: 'Back',
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    
    // Stages
    initiative: 'Initiative',
    initiative_desc: 'Strategic Goals & Epics',
    planning: 'Planning',
    planning_desc: 'Requirements & Stories',
    development: 'Development',
    development_desc: 'Autonomous Coding & Sync',
    testing: 'Testing & Validation',
    testing_desc: 'SRT & Quality Assurance',
    operation: 'Operation',
    operation_desc: 'Distribution & Cloud Ops',

    // Viewers
    repository: 'Repo',
    repository_desc: 'Truthful Asset Inspection',
    repo_hq_title: 'Repository HQ',
    repo_hq_subtitle: 'Truthful Asset Inspection & Code Management',
    tracker: 'Ticket Manager',
    tracker_desc: 'Global Requirement Ledger',
    documents: 'Docs & Assets',
    documents_desc: 'Strategic, Technical & Media Assets',
    doc_vault_title: 'Documentation Vault',
    doc_vault_subtitle: 'Strategic, Technical & Media Asset Intelligence',
    ai_engine: 'AI Engine',
    ai_engine_desc: 'Truthful Intelligence Command Centre',
    ai_engine_title: 'Intelligence Engine',
    ai_engine_subtitle: 'Core Orchestration & AI Model Governance',
    cloud: 'Cloud Platform',
    cloud_desc: 'Multi-Cloud Infrastructure Registry',
    cloud_infra_title: 'Cloud Infrastructure',
    cloud_infra_subtitle: 'Multi-Cloud Provisioning & Service Management',

    // Actions
    new_epic: 'New Epic',
    new_story: 'New Story',
    new_task: 'New Task',
    new_qa: 'New QA Ticket',
    new_triage: 'New Triage Ticket',
    connect_platform: 'Connect Platform',
    initialize: 'Initialize',
    initialize_engine: 'Initialize Engine',
    initialize_provider: 'Initialize Provider',
    
    // Dashboard Common
    velocity: 'Velocity',
    status: 'Status',
    history: 'History',
    active: 'Active',
    shipped: 'Shipped',
    total: 'Total',
    progress: 'Progress',
    completion_rate: 'Completion Rate',
    
    // Initiative Specific
    strategic_progress: 'Strategic Progress',
    strategic_vision: 'strategic vision',
    roadmap_list: 'Mission Critical Roadmap',
    epic_maturity: 'Epic Maturity',

    // Planning Specific
    draft: 'Draft',
    validation: 'Validation',
    finalized: 'Finalized',
    requirement_map: 'Functional Requirement Map',
    requirement_locked: 'requirement locked',
    phase_readiness: 'Phase Readiness',
    arch_blueprint: 'Architecture Blueprint',
    user_personas: 'User Personas',
    story_breakdown: 'Story Breakdown',

    // Development Specific
    queue: 'Queue',
    merged: 'Merged',
    sandbox_mode: 'Running in Sandbox',
    implementation_queue: 'Technical Implementation Queue',
    requirement_fulfillment: 'requirement fulfillment',
    ai_readiness: 'AI Readiness',
    version_control: 'Version Control',
    local_volume: 'Local Development Sandbox Active',
    
    // Testing Specific
    review: 'Review',
    qa_cycle: 'QA Cycle',
    passed: 'Passed',
    score: 'Score',
    system_reliability: 'System Reliability',
    verification_queue: 'Verification Queue',
    feature_verification: 'feature verification',
    approve_release: 'Approve Release',
    srt_engine: 'SRT Engine Active',
    srt_desc: 'Deterministic simulation data ensures that edge cases identified in testing are reproducible.',

    // Operation Specific
    production: 'Production',
    feedback: 'Feedback',
    global_uptime: 'Global Availability',
    live_artifacts: 'Live Artifact Registry',
    stability: 'Stability',
    operational_integrity: 'Operational Integrity',
    triage_desc: 'Production issues intake. Tickets are promoted after triage.',
    traffic_insights: 'Traffic Insights',

    // Sidebar & Filters
    registry_scan: 'Registry Scan',
    matches: 'matches',
    filter_placeholder: 'Filter {tier}s...',
    search_placeholder: 'Search global registry...',
    my_active: 'My Active Tickets',
    active_tickets: 'Active Tickets',
    backlog: 'Backlog',
    completed_tickets: 'Completed Tickets',
    
    // Connection Wizard
    online_connectivity: 'Online Connectivity',
    intel_engine: 'Intelligence Engine',
    cloud_infra: 'Cloud Infrastructure',
    select_provider: 'Select Provider',
    repo_sync: 'Repo Sync',
    repo_sync_desc: 'Store docs in repository',
    provider_url: 'Provider URL',
    access_token: 'Access Token',
    credentials: 'Access Credentials',
    
    // Document Library
    knowledge_base: 'High-integrity knowledge base for strategic and technical assets.',
    search_kb: 'Search registry...',
    updated: 'Updated',
    library_stats: 'Registry Stats',
    total_assets: 'Total Documents',
    total_media: 'Total Media Assets',
    knowledge_sync: 'Asset Sync',
    documents_dir: 'Documents',
    media_assets_dir: 'Media Assets',
    
    // AI Engine
    intel_stack: 'Active Intelligence Stack',
    primary_node: 'Primary Node',
    secondary_node: 'Secondary Node',
    prompt_history: 'Immutable Prompt History',
    orchestration_health: 'Orchestration Health',
    active_nodes: 'Active Nodes',
    token_auth: 'Token Auth',
    authenticated: 'Authenticated',
    
    // Cloud
    cloud_accounts: 'Authenticated Service Accounts',
    iam_roles: 'Revealed IAM Roles',
    infra_health: 'Infrastructure Health',
    security_audit: 'Security Audit',

    // Ticket Detail
    linked_docs: 'Linked Source Documentation',
    requirement_brief: 'Requirement Brief',
    dev_context: 'Development Context',
    integrity_audit: 'Integrity Audit',
    owner: 'Owner',
    target_cycle: 'Target Cycle',
    lifecycle_tier: 'Lifecycle Tier',
    transition_state: 'Transition State',
    modify_details: 'Modify Details',
    locked_stage: 'Locked Stage',
    locked_desc: 'State transitions must be triggered via the terminal for audit logging.',
    
    // Chat
    chat_placeholder: 'Ask the AI Assistant...',
    send: 'Send'
  },
  'Japanese (日本語)': {
    // General
    stages: '開発ステージ',
    viewers: 'システムビューアー',
    settings: '設定',
    back: '戻る',
    save: '保存',
    cancel: 'キャンセル',
    loading: '読み込み中...',
    success: '成功',
    error: 'エラー',

    // Stages
    initiative: 'イニシアチブ',
    initiative_desc: '戦略的目標とエピック',
    planning: 'プランニング',
    planning_desc: '要件とストーリー',
    development: '開発',
    development_desc: '自律型コーディングと同期',
    testing: 'テストと検証',
    testing_desc: 'SRTと品質保証',
    operation: '運用',
    operation_desc: '配信とクラウド運用',

    // Viewers
    repository: 'リポジトリ',
    repository_desc: '正確なアセット検査',
    repo_hq_title: 'リポジトリHQ',
    repo_hq_subtitle: '正確なアセット検査とコード管理',
    tracker: 'チケット管理 (Ticket Manager)',
    tracker_desc: '要件とチケットのグローバル台帳',
    documents: 'ドキュメントとアセット',
    documents_desc: '戦略的、技術的、およびメディアアセット',
    doc_vault_title: 'ドキュメント・ボルト',
    doc_vault_subtitle: '戦略的、技術的、およびメディアアセットのインテリジェンス',
    ai_engine: 'AIエンジン',
    ai_engine_desc: '真実のインテリジェンス・コマンドセンター',
    ai_engine_title: 'インテリジェンス・エンジン',
    ai_engine_subtitle: 'コア・オーケストレーションとAIモデル・ガバナンス',
    cloud: 'クラウドプラットフォーム',
    cloud_desc: 'マルチクラウド・インフラストラクチャ・レジストリ',
    cloud_infra_title: 'クラウド・インフラストラクチャ',
    cloud_infra_subtitle: 'マルチクラウド・プロビジョニングとサービス管理',

    // Actions
    new_epic: '新規エピック',
    new_story: '新規ストーリー',
    new_task: '新規タスク',
    new_qa: '新規QAチケット',
    new_triage: '新規トライアージ',
    connect_platform: 'プラットフォームを接続',
    initialize: '初期化',
    initialize_engine: 'エンジンを初期化',
    initialize_provider: 'プロバイダーを初期化',

    // Dashboard Common
    velocity: 'ベロシティ',
    status: 'ステータス',
    history: '履歴',
    active: 'アクティブ',
    shipped: '出荷済み',
    total: '合計',
    progress: '進捗',
    completion_rate: '完了率',

    // Initiative Specific
    strategic_progress: '戦略的進捗',
    strategic_vision: '戦略的ビジョン',
    roadmap_list: 'ミッションクリティカル・ロードマップ',
    epic_maturity: 'エピックの成熟度',

    // Planning Specific
    draft: 'ドラフト',
    validation: '検証',
    finalized: '確定済み',
    requirement_map: '機能要件マップ',
    requirement_locked: '要件確定済み',
    phase_readiness: 'フェーズ準備状況',
    arch_blueprint: 'アーキテクチャ設計図',
    user_personas: 'ユーザーペルソナ',
    story_breakdown: 'ストーリーの細分化',

    // Development Specific
    queue: 'キュー',
    merged: 'マージ済み',
    sandbox_mode: 'サンドボックスで実行中',
    implementation_queue: '技術実装キュー',
    requirement_fulfillment: '要件の履行',
    ai_readiness: 'AI準備状況',
    version_control: 'バージョン管理',
    local_volume: 'ローカル開発サンドボックスが有効',

    // Testing Specific
    review: 'レビュー',
    qa_cycle: 'QAサイクル',
    passed: '合格',
    score: 'スコア',
    system_reliability: 'システム信頼性',
    verification_queue: '検証キュー',
    feature_verification: '機能検証',
    approve_release: 'リリースを承認',
    srt_engine: 'SRTエンジン稼働中',
    srt_desc: '確定的シミュレーションデータにより、テストで特定されたエッジケースの再現性が保証されます。',

    // Operation Specific
    production: '本番環境',
    feedback: 'フィードバック',
    global_uptime: 'グローバル可用性',
    live_artifacts: '本番アセットレジストリ',
    stability: '安定性',
    operational_integrity: '運用の整合性',
    triage_desc: '本番の問題を受け付けます。トリアージ後にチケットが昇格されます。',
    traffic_insights: 'トラフィック分析',

    // Sidebar & Filters
    registry_scan: 'レジストリスキャン',
    matches: '件の一致',
    filter_placeholder: '{tier}をフィルター...',
    search_placeholder: 'グローバルレジストリを検索...',
    my_active: 'マイ・アクティブ・チケット',
    active_tickets: 'アクティブ・チケット',
    backlog: 'バックログ',
    completed_tickets: '完了したチケット',

    // Connection Wizard
    online_connectivity: 'オンライン接続',
    intel_engine: 'インテリジェンス・エンジン',
    cloud_infra: 'クラウド・インフラ',
    select_provider: 'プロバイダーを選択',
    repo_sync: 'リポジトリ同期',
    repo_sync_desc: 'ドキュメントをリポジトリに保存',
    provider_url: 'プロバイダーURL',
    access_token: 'アクセストークン',
    credentials: 'アクセス資格情報',

    // Document Library
    knowledge_base: '戦略的および技術的アセットのための高精度ナレッジベース',
    search_kb: 'レジストリを検索...',
    updated: '更新日',
    library_stats: 'レジストリ統計',
    total_assets: 'ドキュメント総数',
    total_media: 'メディアアセット総数',
    knowledge_sync: 'アセット同期',
    documents_dir: 'ドキュメント',
    media_assets_dir: 'メディアアセット',

    // AI Engine
    intel_stack: 'アクティブ・インテリジェンス・スタック',
    primary_node: 'プライマリノード',
    secondary_node: 'セカンダリノード',
    prompt_history: '不変のプロンプト履歴',
    orchestration_health: 'オーケストレーションの健全性',
    active_nodes: 'アクティブなノード',
    token_auth: 'トークン認証',
    authenticated: '認証済み',

    // Cloud
    cloud_accounts: '認証済みサービスアカウント',
    iam_roles: '公開されたIAMロール',
    infra_health: 'インフラの健全性',
    security_audit: 'セキュリティ監査',

    // Ticket Detail
    linked_docs: 'リンクされたソースドキュメント',
    requirement_brief: '要件概要',
    dev_context: '開発コンテキスト',
    integrity_audit: '整合性監査',
    owner: '所有者',
    target_cycle: '目標サイクル',
    lifecycle_tier: 'ライフサイクル層',
    transition_state: '状態を移行',
    modify_details: '詳細を修正',
    locked_stage: 'ロックされたステージ',
    locked_desc: '状態の移行は、監査ログのためにターミナルから実行する必要があります。',

    // Chat
    chat_placeholder: 'AIアシスタントに質問する...',
    send: '送信'
  }
};

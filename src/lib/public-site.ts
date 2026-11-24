export type PublicSiteLocale = "zh" | "en";
export type PublicSiteArticle = {
    slug: string;
    zh: { title: string; description: string; keywords: string[]; sections: [string, string][] };
    en: { title: string; description: string; keywords: string[]; sections: [string, string][] };
};

// Public product facts only. Pricing, enabled models and private user content are intentionally absent.
export const publicSiteArticles: PublicSiteArticle[] = [
    {
        slug: "",
        zh: {
            title: "AI 影视与短剧创作工作台",
            description: "在一个工作台中组织 AI 图片生成、AI 视频生成、剧本构思与分镜画布。从创意、参考素材到镜头制作，逐步推进影视与短剧创作。",
            keywords: ["AI影视创作", "AI短剧制作", "AI图片生成", "AI视频生成", "分镜画布", "AI创作工作台"],
            sections: [
                ["从故事想法开始", "用文字描述一个角色、一段剧情或一个画面，在创作工作台选择文本、图片或视频任务。先梳理故事目标、角色关系与场景，再把需要制作的镜头拆成可执行的创作步骤。"],
                ["把图片、视频与参考素材放在一起", "工作台提供图片与视频创作入口，支持在相应任务中组织提示词和参考素材。具体支持的输入方式、时长、分辨率与模型以登录后的当前配置为准；提交前查看可用模型、参数和积分费用。"],
                ["用画布组织分镜与制作过程", "自由画布用于组织创意节点、分镜描述、图片和视频。将故事构思、视觉参考与镜头结果放在同一创作空间中，方便逐镜比较、修改与继续生成。短剧项目可以进一步组织角色、场景与分镜。"],
                ["使用与费用", "公开产品介绍无需登录。生成任务、个人项目和积分管理需要登录并满足站点当前权限。模型可用性、套餐、积分价格和支付方式以工作台实时显示为准，介绍页不提供固定售价或生成质量保证。"],
            ],
        },
        en: {
            title: "AI filmmaking and short drama creation workspace",
            description: "Organize AI image generation, AI video generation, story development and storyboard canvases in one workspace, from ideas and visual references to individual shots.",
            keywords: ["AI filmmaking", "AI short drama maker", "AI image generator", "AI video generator", "storyboard canvas", "AI creative workspace"],
            sections: [
                ["Start with a story idea", "Describe a character, a scene or a visual idea and choose a text, image or video task. Establish the story goal, character relationships and setting before breaking a scene into practical shot descriptions."],
                [
                    "Keep images, videos and references together",
                    "Use the image and video creation tools to organize prompts and reference assets for supported tasks. Available inputs, duration, resolution and models depend on the current workspace configuration. Review the selected model, parameters and credit cost before submitting a generation.",
                ],
                [
                    "Organize production on a storyboard canvas",
                    "The freeform canvas brings idea nodes, shot descriptions, images and videos into one visual space. Compare results, refine a shot and continue creating without losing its references. Short drama projects also help organize characters, settings and storyboards.",
                ],
                [
                    "Access and billing",
                    "These product guides are public. Generating media, managing personal projects and using wallet features require sign-in and the applicable permissions. Model availability, packages, credit prices and payment methods are shown in the live workspace; these guides do not promise fixed prices or output quality.",
                ],
            ],
        },
    },
    {
        slug: "ai-image-generator",
        zh: {
            title: "AI 图片生成与视觉参考创作",
            description: "用文字描述和可用参考图创建 AI 图片，为短剧人物、场景、风格探索和分镜画面准备视觉素材。",
            keywords: ["AI图片生成", "AI绘画", "文生图", "图生图", "角色概念图", "分镜图片"],
            sections: [
                ["将画面想法写成提示词", "明确画面的主体、场景、构图、光线与视觉风格。为角色概念图写清服装、动作和环境，为场景图补充空间关系与镜头视角，减少在一次任务中混入相互矛盾的要求。"],
                ["使用参考图与模型参数", "在支持参考图片的任务中加入视觉素材，帮助表达角色外观、构图或风格方向。不同模型支持的参考图数量、画幅和输出规格不同，选择模型后按界面提供的参数填写，不能假定所有模型支持相同输入。"],
                ["从图片继续推进镜头", "把生成结果作为画布中的视觉参考，与分镜描述和后续视频任务放在一起。逐张检查人物、物体、文字与构图，选择合适的素材继续迭代；生成结果仍需要创作者审核。"],
            ],
        },
        en: {
            title: "AI image generation and visual references",
            description: "Create AI images from prompts and supported image references for character concepts, settings, visual exploration and storyboard frames.",
            keywords: ["AI image generator", "text to image", "image to image", "AI art workspace", "character concept art", "storyboard images"],
            sections: [
                [
                    "Turn a visual idea into a prompt",
                    "Describe the subject, setting, composition, lighting and visual style. Character concepts benefit from clear clothing, action and environment details; setting images benefit from spatial relationships and a camera angle. Avoid conflicting instructions within the same task.",
                ],
                [
                    "Choose references and model parameters",
                    "Add visual references when the selected task supports them to communicate appearance, composition or style. Reference limits, aspect ratios and output specifications vary by model. Use the parameters available in the interface rather than assuming every model accepts the same inputs.",
                ],
                [
                    "Develop the next shot",
                    "Keep selected images on the canvas alongside storyboard notes and subsequent video tasks. Review people, objects, text and composition before choosing an image for further iteration. Generated assets require creative review and are not guaranteed to match every prompt detail.",
                ],
            ],
        },
    },
    {
        slug: "ai-video-generator",
        zh: {
            title: "AI 视频生成与镜头创作",
            description: "组织 AI 文生视频、图生视频的提示词、参考素材与生成结果，为短剧和影视分镜逐个制作镜头。具体模式以所选模型支持为准。",
            keywords: ["AI视频生成", "文生视频", "图生视频", "AI镜头制作", "AI短片创作"],
            sections: [
                ["每次聚焦一个镜头", "先确定主体动作、场景变化、镜头运动和光线氛围，再选择适合的生成规格。复杂叙事可以拆成多个镜头分别生成和审阅，避免把整集剧情压进一段短视频提示词。"],
                ["按模型能力提供输入", "选择当前可用的视频模型与规格，按界面要求添加文字或参考图等素材。文生视频、图生视频以及其他参考方式是否可用，取决于所选模型与站点配置；时长、画幅和分辨率也以实际选项为准。"],
                ["查看任务并整理结果", "提交前确认积分费用，提交后在任务与创作记录中查看状态。把可用结果与原始分镜描述放在画布上比较，检查运动、主体变化和镜头衔接，再决定是否继续调整或制作下一个镜头。"],
            ],
        },
        en: {
            title: "AI video generation and shot creation",
            description: "Organize prompts, reference assets and AI video results for filmmaking and short drama shots. Text-to-video and image-to-video availability depends on the selected model.",
            keywords: ["AI video generator", "text to video", "image to video", "AI filmmaking shots", "AI short film creation"],
            sections: [
                [
                    "Focus on one shot at a time",
                    "Define the subject action, setting changes, camera movement and lighting before selecting generation parameters. Break complex narrative sequences into shots that can be generated and reviewed individually instead of compressing an entire episode into one short video prompt.",
                ],
                [
                    "Supply inputs supported by the model",
                    "Choose an available video model and provide the text or reference images requested by the interface. Text-to-video, image-to-video and other reference modes depend on model capabilities and site configuration. Duration, aspect ratio and resolution are determined by the available options.",
                ],
                [
                    "Review tasks and organize results",
                    "Check the credit cost before submitting. Follow progress in task and creation history, then compare the result with the storyboard on the canvas. Review motion, subject changes and continuity before revising a shot or moving to the next one.",
                ],
            ],
        },
    },
    {
        slug: "ai-short-drama",
        zh: {
            title: "AI 短剧制作与剧本分镜工作流",
            description: "从故事构思、角色与场景准备到分镜图片和视频镜头，用 AI 创作工作台逐步组织短剧制作。",
            keywords: ["AI短剧制作", "AI短剧工作流", "AI剧本创作", "短剧分镜", "AI影视制作"],
            sections: [
                ["梳理故事与角色", "先写清故事目标、主要冲突、人物关系与场景。文本创作可以辅助讨论剧情方向、整理人物设定与续写故事；生成文本应由创作者检查逻辑、措辞与使用权。"],
                ["把剧情拆成可执行分镜", "为每个镜头记录场景、出场角色、动作、景别和镜头运动。使用项目与画布组织这些信息，并为需要保持一致的角色和场景挑选可复用参考素材。参考素材有助于表达方向，但不保证模型跨镜头完全一致。"],
                ["逐镜制作并检查衔接", "先探索分镜图与视觉方向，再根据可用模型制作视频镜头。检查角色外观、动作、光线和前后镜头是否衔接，再安排下一轮生成。生成结果、素材与任务记录可以在工作台中统一整理。"],
            ],
        },
        en: {
            title: "AI short drama production and script-to-storyboard workflow",
            description: "Develop short dramas step by step, from story ideas, characters and settings to storyboard images and AI-generated video shots.",
            keywords: ["AI short drama maker", "AI drama production", "AI script writing", "script to storyboard", "AI film production workflow"],
            sections: [
                [
                    "Develop the story and characters",
                    "Establish the story goal, central conflict, character relationships and locations. Text creation can help explore plot directions, organize character notes and continue a story. Creators should review generated text for logic, wording and usage rights.",
                ],
                [
                    "Translate the script into practical shots",
                    "Record the location, characters, action, shot size and camera movement for each shot. Organize the information in projects and on the canvas, then select reusable references for characters and settings. References help communicate a direction but do not guarantee exact consistency across generations.",
                ],
                [
                    "Produce and review shots individually",
                    "Explore storyboard images and visual direction before generating videos with available models. Review appearance, action, lighting and continuity between shots before the next generation pass. Keep outputs, reference assets and task history organized in the workspace.",
                ],
            ],
        },
    },
    {
        slug: "storyboard-canvas",
        zh: {
            title: "AI 分镜画布与可视化创作",
            description: "在自由画布中连接创意、文本、参考图与视频镜头，用可视化节点组织 AI 分镜和影视创作过程。",
            keywords: ["AI分镜", "分镜画布", "可视化创作", "AI创作画布", "影视分镜工作台"],
            sections: [
                ["让故事与素材处于同一个视野", "画布把文本想法、图片与视频节点放在一个可缩放的空间中。按剧情顺序或制作阶段安排节点，把每个镜头的说明与素材放在一起，帮助创作者理解故事结构和制作进度。"],
                ["通过引用继续创作", "为任务整理相关提示词和参考素材，并利用画布关系组织上下文。模型任务仍需明确选择输入与参数；连线和摆放本身不会自动授权收费生成，也不会自动保证叙事或角色一致。"],
                ["在创作空间中审阅结果", "比较候选画面、调整分镜描述、保留合适的结果，再进入下一轮制作。个人画布和项目需要登录访问，不属于公开产品介绍；如需分享，请先审阅将公开的内容并使用站点提供的分享功能。"],
            ],
        },
        en: {
            title: "AI storyboard canvas and visual creation workspace",
            description: "Connect ideas, text, reference images and video shots on a freeform canvas to organize AI storyboarding and filmmaking visually.",
            keywords: ["AI storyboard", "storyboard canvas", "visual creative workspace", "AI canvas", "filmmaking storyboard tool"],
            sections: [
                [
                    "See the story and its assets together",
                    "Place text ideas, images and video nodes in a zoomable visual space. Arrange nodes by story sequence or production stage and keep shot descriptions beside their references to understand the structure and progress of a project.",
                ],
                [
                    "Continue creating with references",
                    "Organize prompts and relevant reference assets for each task, using canvas relationships to keep context understandable. Generation still requires explicit inputs and parameters. Connecting or arranging nodes does not automatically authorize paid generation or guarantee narrative and character consistency.",
                ],
                [
                    "Review results in context",
                    "Compare candidate images, revise shot descriptions and keep suitable results before the next production pass. Personal canvases and projects require sign-in and are separate from public product guides. Review the content you intend to disclose before using the available sharing feature.",
                ],
            ],
        },
    },
];

export function publicArticlePath(locale: PublicSiteLocale, slug = "") {
    return `/discover/${locale}/${slug ? `${slug}/` : ""}`;
}

import type { Condition, GameEvent } from '../types/game'

const hasFlag = (flag: string, present = true): Condition => ({ type: 'flag', flag, present })
const stat = (
  key: 'deadlines' | 'budget' | 'team' | 'client',
  operator: 'lt' | 'lte' | 'gt' | 'gte',
  value: number,
): Condition => ({ type: 'stat', key, operator, value })
const relationship = (
  character: 'alexey' | 'mikhail' | 'irina' | 'olga' | 'vera',
  operator: 'lt' | 'lte' | 'gt' | 'gte',
  value: number,
): Condition => ({ type: 'relationship', character, operator, value })
const all = (...conditions: Condition[]): Condition => ({ type: 'all', conditions })
const any = (...conditions: Condition[]): Condition => ({ type: 'any', conditions })

export const TOTAL_STAGES = 6

const scenarioCatalog: GameEvent[] = [
  {
    id: 'supply-delay',
    stage: 1,
    time: '09:02',
    title: 'Сорвана поставка',
    context: 'Критическая задача дня — собрать и отправить клиенту пилотную партию.',
    thread: 'Ресурсы',
    timedDecision: { seconds: 45, fallbackChoiceId: 'replan-production' },
    messages: [
      {
        id: 'supply-1',
        author: 'alexey',
        time: '09:02',
        tone: 'urgent',
        text: 'Доброе утро тоже отменяется. Машина с комплектующими будет только завтра. Без них линия встанет через два часа.',
      },
      {
        id: 'supply-2',
        author: 'mikhail',
        time: '09:03',
        text: 'Есть резервный поставщик. Привезёт сегодня, но цена выше на 35%, а документы пришлёт следом.',
      },
    ],
    choices: [
      {
        id: 'wait-supplier',
        label: 'A',
        text: 'Ждём штатного поставщика и перестраиваем график.',
        effects: { deadlines: -12, team: -2, client: -2 },
        flags: ['waitSupplier'],
        reactions: [
          { id: 'supply-a-r1', author: 'alexey', text: 'Развожу людей по другим задачам. Сегодняшний график уже не собрать, но бюджет не трогаем.' },
        ],
        delayedConsequences: [
          {
            id: 'wait-supplier-eta',
            afterEvents: 2,
            effects: { deadlines: -7, client: -5 },
            messages: [
              { id: 'wait-supplier-later', author: 'olga', tone: 'urgent', text: 'Клиент заметил сдвиг в статусе раньше, чем получил объяснение. Просит новый точный срок.' },
            ],
          },
        ],
        insight: 'Вы сохранили деньги, но неопределённость превратилась в сдвиг графика и сложный разговор с клиентом.',
      },
      {
        id: 'reserve-supplier',
        label: 'B',
        text: 'Покупаем у резервного и ускоряем доставку.',
        effects: { deadlines: 9, budget: -15, team: 2 },
        flags: ['reserveSupplier'],
        reactions: [
          { id: 'supply-b-r1', author: 'mikhail', tone: 'positive', text: 'Подтверждаю срочную закупку. Линию удержим, финансовый резерв станет заметно тоньше.' },
        ],
        delayedConsequences: [
          {
            id: 'reserve-paperwork',
            afterEvents: 4,
            effects: { budget: -4 },
            messages: [
              { id: 'reserve-paperwork-later', author: 'vera', text: 'По срочной закупке появился дополнительный платёж за логистику. Сюрприз небольшой, но уже наш.' },
            ],
          },
        ],
        insight: 'Быстрый резерв защитил срок, но купил его за счёт бюджета и дополнительного риска по документам.',
      },
      {
        id: 'replan-production',
        label: 'C',
        text: 'Переносим людей на подготовку и выигрываем время внутри процесса.',
        effects: { deadlines: -4, team: -5, client: -1 },
        flags: ['replanProduction'],
        reactions: [
          { id: 'supply-c-r1', author: 'alexey', text: 'Переставляю смену. Третий план за утро никого не радует, но простой сократим.' },
        ],
        insight: 'Вы приняли ограничение и сократили простой, но заплатили устойчивостью команды и небольшим сдвигом.',
      },
    ],
  },
  {
    id: 'missing-employee',
    stage: 2,
    time: '09:48',
    title: 'Выпал ключевой сотрудник',
    context: 'Финальную проверку сегодня должен был принимать один человек.',
    thread: 'Команда',
    messages: [
      {
        id: 'employee-1',
        author: 'irina',
        time: '09:48',
        tone: 'urgent',
        text: 'Антон с температурой 39. Он единственный, кто обычно принимает финальную сборку. И нет, это не метафора про горячий проект.',
      },
    ],
    choices: [
      {
        id: 'ask-anton',
        label: 'A',
        text: 'Просим Антона подключиться удалённо на несколько часов.',
        effects: { deadlines: 7, team: -12 },
        flags: ['overloadEmployee'],
        reactions: [
          { id: 'employee-a-r1', author: 'irina', text: 'Напишу ему. Команда точно запомнит, как мы обращаемся с температурой 39.' },
        ],
        delayedConsequences: [
          {
            id: 'anton-aftershock',
            afterEvents: 3,
            effects: { team: -7 },
            messages: [
              { id: 'anton-aftershock-message', author: 'irina', tone: 'urgent', text: 'После истории с Антоном люди нервно реагируют на любое «нужно ещё немного поднажать».' },
            ],
          },
        ],
        insight: 'Вы закрыли дефицит экспертизы сегодня, но нарушили важную границу и снизили доверие команды.',
      },
      {
        id: 'junior-review',
        label: 'B',
        text: 'Передаём проверку двум менее опытным сотрудникам по чек-листу.',
        effects: { deadlines: -6, team: 2 },
        flags: ['juniorReview'],
        reactions: [
          { id: 'employee-b-r1', author: 'irina', tone: 'positive', text: 'Соберу пару и дам чек-лист. Медленнее, зато знание перестанет жить в одном человеке.' },
        ],
        delayedConsequences: [
          {
            id: 'junior-growth',
            afterEvents: 4,
            effects: { deadlines: 4, team: 5 },
            messages: [
              { id: 'junior-growth-message', author: 'irina', tone: 'positive', text: 'Пара по чек-листу уже нашла две мелочи сама. Сегодня они медленнее, завтра у нас будет настоящий резерв.' },
            ],
            flags: ['knowledgeShared'],
          },
        ],
        insight: 'Вы обменяли часть скорости на распределённую экспертизу. Позже это вернётся устойчивостью и темпом.',
      },
      {
        id: 'manager-controls',
        label: 'C',
        text: 'Беру контроль финальной сборки на себя.',
        effects: { deadlines: 3, team: 3 },
        flags: ['managerMicromanages'],
        reactions: [
          { id: 'employee-c-r1', author: 'irina', text: 'Подготовлю всё к вашей проверке и прикрою остальной поток. Календарь у вас, правда, уже дымится.' },
        ],
        delayedConsequences: [
          {
            id: 'manager-bottleneck',
            afterEvents: 3,
            effects: { deadlines: -7, team: -3 },
            messages: [
              { id: 'manager-bottleneck-message', author: 'alexey', text: 'Два решения ждут вашей проверки. Похоже, узким местом сегодня стали уже вы.' },
            ],
          },
        ],
        insight: 'Личный контроль быстро успокоил команду, но создал управленческое узкое место через несколько часов.',
      },
    ],
  },
  {
    id: 'reserve-delivery',
    stage: 3,
    time: '10:27',
    title: 'Резерв приехал без запаса',
    context: 'Срочная поставка на месте, но комплект документов неполный.',
    thread: 'Ресурсы',
    when: hasFlag('reserveSupplier'),
    messages: [
      { id: 'reserve-1', author: 'mikhail', time: '10:27', tone: 'urgent', text: 'Машина приехала. Сертификат на партию обещают через час. Производство готово принимать прямо сейчас.' },
      { id: 'reserve-2', author: 'vera', time: '10:28', text: 'Мы уже заплатили за скорость. Давайте хотя бы не покупать вместе с ней нарушение процедуры.' },
    ],
    choices: [
      {
        id: 'quarantine-batch', label: 'A', text: 'Ждём документы и держим партию в карантине.',
        effects: { deadlines: -7, team: 2, client: -1 }, flags: ['supplierChecked'],
        reactions: [{ id: 'reserve-a-r1', author: 'alexey', text: 'Принял. Не запускаю материал до подтверждения. Час потеряем, риск — нет.' }],
        insight: 'Вы защитили качество и процедуру, сознательно отказавшись от части купленной скорости.',
      },
      {
        id: 'accept-verbal', label: 'B', text: 'Запускаем по письменной гарантии поставщика.',
        effects: { deadlines: 7, team: -2 }, flags: ['supplierRisk'],
        reactions: [{ id: 'reserve-b-r1', author: 'mikhail', text: 'Зафиксирую гарантию письмом. Это всё ещё риск, просто теперь он хорошо оформлен.' }],
        delayedConsequences: [{
          id: 'supplier-risk-later', afterEvents: 3, effects: { client: -7, budget: -3 }, flags: ['qualityPressure'],
          messages: [{ id: 'supplier-risk-message', author: 'alexey', tone: 'urgent', text: 'В срочной партии есть нестабильный параметр. Не критично, но теперь проверка должна быть шире.' }],
        }],
        insight: 'Документированная гарантия ускорила работу, но не убрала технический риск — он вернётся на проверке.',
      },
      {
        id: 'split-batch', label: 'C', text: 'Проверяем образцы и запускаем партию частями.',
        effects: { deadlines: 1, budget: -3, team: -1 }, flags: ['segmentedBatch', 'qualityContained'],
        reactions: [{ id: 'reserve-c-r1', author: 'alexey', tone: 'positive', text: 'Сделаем входной контроль на образцах и разделим запуск. Не идеально быстро, зато управляемо.' }],
        insight: 'Частичный запуск сохранил темп и ограничил масштаб возможной ошибки, потребовав больше координации.',
      },
    ],
  },
  {
    id: 'production-gap',
    stage: 3,
    time: '10:27',
    title: 'Линия ждёт решения',
    context: 'До штатной поставки ещё далеко, а подготовительные работы заканчиваются.',
    thread: 'Ресурсы',
    when: hasFlag('reserveSupplier', false),
    messages: [
      { id: 'gap-1', author: 'alexey', time: '10:27', tone: 'urgent', text: 'Подготовительные задачи почти закончились. Через сорок минут часть смены останется без полезной работы.' },
      { id: 'gap-2', author: 'mikhail', time: '10:28', text: 'Могу собрать недостающий объём у двух местных подрядчиков. Дороже штатного, но без экстренной наценки.' },
    ],
    choices: [
      {
        id: 'local-split', label: 'A', text: 'Делим объём между местными подрядчиками.',
        effects: { deadlines: 5, budget: -9, team: -1 }, flags: ['segmentedBatch'],
        reactions: [{ id: 'gap-a-r1', author: 'mikhail', tone: 'positive', text: 'Соберу две поставки и общий контроль. Логистики больше, зато линия не встанет.' }],
        insight: 'Диверсификация вернула темп, но добавила стоимость и сложность контроля двух партий.',
      },
      {
        id: 'cross-train', label: 'B', text: 'Используем паузу для обучения и подготовки следующего этапа.',
        effects: { deadlines: -5, team: 7, budget: 1 }, flags: ['teamTraining'],
        reactions: [{ id: 'gap-b-r1', author: 'irina', tone: 'positive', text: 'Проведём короткий разбор процесса. Редкий случай: простой можно превратить в инвестицию.' }],
        insight: 'Вы не скрыли потерю времени, зато превратили её в рост автономности команды.',
      },
      {
        id: 'overtime-prep', label: 'C', text: 'Готовим всё заранее и компенсируем простой вечером.',
        effects: { deadlines: 4, team: -8 }, flags: ['overtimePrep'],
        reactions: [{ id: 'gap-c-r1', author: 'alexey', text: 'Подготовим оснастку и останемся вечером. График догоняем людьми — они это тоже понимают.' }],
        delayedConsequences: [{
          id: 'overtime-fatigue', afterEvents: 4, effects: { team: -6 },
          messages: [{ id: 'overtime-fatigue-message', author: 'irina', tone: 'urgent', text: 'Вечерняя компенсация уже обсуждается как обязательная. Усталость пришла раньше самой смены.' }],
        }],
        insight: 'Сверхусилие сохранило график, но перенесло цену на людей и вторую половину дня.',
      },
    ],
  },
  {
    id: 'client-change',
    stage: 4,
    time: '11:14',
    title: 'Клиент передумал',
    context: 'В согласованный объём пытается войти ещё один «маленький» блок.',
    thread: 'Клиент',
    messages: [
      { id: 'client-1', author: 'olga', time: '11:14', text: 'Клиент просит добавить маркировку новой партии. Говорит, изменение маленькое.' },
      { id: 'client-2', author: 'olga', time: '11:15', tone: 'urgent', text: 'Оно не маленькое. Нужно менять шаблон, документы и часть проверки.' },
    ],
    messageVariants: [
      [{ id: 'client-variant-brief', author: 'olga', text: 'Запрос уже переслали в общий чат клиента — пауза тоже будет выглядеть ответом.' }],
      [{ id: 'client-variant-call', author: 'olga', text: 'Через десять минут у клиента внутренний созвон. До него лучше обозначить позицию.' }],
    ],
    conditionalMessages: [
      { id: 'client-cond-delay', author: 'olga', when: hasFlag('waitSupplier'), text: 'И да: разговор начинается на фоне уже замеченного сдвига по поставке.' },
      { id: 'client-cond-fast', author: 'olga', when: hasFlag('reserveSupplier'), text: 'Пока клиент уверен, что мы идём по плану. Это хорошая позиция для переговоров.' },
    ],
    choices: [
      {
        id: 'accept-silently', label: 'A', text: 'Добавляем без пересогласования условий.',
        effects: { deadlines: -10, budget: -6, team: -7, client: 8 }, flags: ['acceptSilently'],
        reactions: [{ id: 'client-a-r1', author: 'olga', text: 'Клиент будет доволен. Команде подберу формулировку без слов «ещё одна срочная мелочь».' }],
        delayedConsequences: [{
          id: 'silent-scope-cost', afterEvents: 2, effects: { deadlines: -7, budget: -5 }, flags: ['scopeDebt'],
          messages: [{ id: 'silent-scope-message', author: 'vera', tone: 'urgent', text: 'Новый объём начал расходовать резерв. В договоре его по-прежнему не существует.' }],
        }],
        insight: 'Быстрое согласие укрепило отношения с клиентом, но создало неоплаченный объём и скрытый долг по срокам.',
      },
      {
        id: 'refuse-change', label: 'B', text: 'Отказываемся: объём уже зафиксирован.',
        effects: { deadlines: 6, budget: 3, team: 3, client: -11 }, flags: ['refuseChange'],
        reactions: [{ id: 'client-b-r1', author: 'olga', text: 'Зафиксирую отказ. Граница ясная, разговор будет неприятный.' }],
        insight: 'Вы защитили обязательства и команду, но оставили клиента без альтернативы и снизили доверие.',
      },
      {
        id: 'negotiate-change', label: 'C', text: 'Берём изменение после согласования цены и этапов.',
        effects: { deadlines: -3, budget: 5, team: -2, client: 4 }, flags: ['scopeNegotiated'],
        reactions: [{ id: 'client-c-r1', author: 'olga', tone: 'positive', text: 'Предложу отдельный этап и стоимость. Клиент получит изменение, а команда — реальное обязательство.' }],
        insight: 'Переговоры заняли время, но превратили запрос в управляемый объём с понятной ценой.',
      },
    ],
  },
  {
    id: 'quality-signal',
    stage: 5,
    time: '12:36',
    title: 'Контроль нашёл отклонение',
    context: 'Проблема локальная, но её границы пока неизвестны.',
    thread: 'Качество',
    timedDecision: { seconds: 40, fallbackChoiceId: 'quality-contain' },
    messages: [
      { id: 'quality-1', author: 'alexey', time: '12:36', tone: 'urgent', text: 'На проверке два изделия дали отклонение. Можно остановить всё, проверить участок или продолжить до полной картины.' },
    ],
    conditionalMessages: [
      { id: 'quality-cond-supplier', author: 'mikhail', when: hasFlag('supplierRisk'), text: 'Похоже на материал из срочной партии. Письменная гарантия поставщика физику не изменила.' },
      { id: 'quality-cond-junior', author: 'irina', when: hasFlag('juniorReview'), tone: 'positive', text: 'Отклонение нашли ребята по новому чек-листу. Он уже окупается.' },
      { id: 'quality-cond-split', author: 'alexey', when: hasFlag('segmentedBatch'), text: 'Плюс разделения партии: подозрительный объём пока изолирован.' },
    ],
    choices: [
      {
        id: 'quality-stop', label: 'A', text: 'Останавливаем процесс и перепроверяем весь объём.',
        effects: { deadlines: -13, budget: -4, team: 5, client: -2 }, flags: ['qualityFirst'],
        reactions: [{ id: 'quality-a-r1', author: 'alexey', tone: 'positive', text: 'Останавливаю линию. Задержки не любят, переделки любят ещё меньше.' }],
        insight: 'Полная остановка максимально снизила риск дефекта, но заметно ударила по сроку.',
      },
      {
        id: 'quality-contain', label: 'B', text: 'Изолируем участок, расширяем выборку и продолжаем остальное.',
        effects: { deadlines: -4, budget: -3, team: -1, client: 1 }, flags: ['qualityContained'],
        reactions: [{ id: 'quality-b-r1', author: 'alexey', text: 'Расширяю контроль вокруг проблемного участка. Остальной поток продолжит работу.' }],
        insight: 'Локализация сбалансировала скорость и контроль, потребовав точной координации.',
      },
      {
        id: 'quality-risk', label: 'C', text: 'Продолжаем, полную проверку делаем перед отгрузкой.',
        effects: { deadlines: 6, team: -5, client: -1 }, flags: ['qualityRisk'],
        reactions: [{ id: 'quality-c-r1', author: 'alexey', text: 'Продолжаю. Перед машиной нам понадобится очень честная финальная проверка.' }],
        delayedConsequences: [{
          id: 'quality-risk-returns', afterEvents: 2, effects: { deadlines: -6, client: -8 }, flags: ['qualityPressure'],
          messages: [{ id: 'quality-risk-message-later', author: 'alexey', tone: 'urgent', text: 'Отложенная проверка стала срочной: отклонение повторилось ещё в одной части партии.' }],
        }],
        insight: 'Вы выиграли время сейчас, но перенесли неопределённость ближе к моменту отгрузки.',
      },
    ],
  },
  {
    id: 'scope-agreement',
    stage: 6,
    time: '13:18',
    title: 'Клиент вернулся с условиями',
    context: 'Изменение согласовано, но выполнить всё одновременно не получится.',
    thread: 'Клиент',
    when: hasFlag('scopeNegotiated'),
    messages: [
      { id: 'scope-ok-1', author: 'olga', time: '13:18', tone: 'positive', text: 'Клиент согласен на доплату и этапность. Но просит сегодня показать хотя бы часть нового блока.' },
      { id: 'scope-ok-2', author: 'vera', time: '13:19', text: 'Доплата покрывает работу, если мы не превратим первый этап в бесплатный второй.' },
    ],
    choices: [
      {
        id: 'paid-preview', label: 'A', text: 'Делаем сегодня короткий оплаченный прототип изменения.',
        effects: { deadlines: -5, budget: 5, team: -3, client: 5 }, flags: ['paidPreview'],
        reactions: [{ id: 'scope-ok-a', author: 'olga', tone: 'positive', text: 'Зафиксирую формат прототипа и критерии. Клиент увидит движение, команда — границу.' }],
        insight: 'Малый оплаченный результат укрепил доверие, но отнял часть сегодняшнего фокуса.',
      },
      {
        id: 'next-release', label: 'B', text: 'Всё изменение уходит в следующий согласованный этап.',
        effects: { deadlines: 4, budget: 4, team: 3, client: -3 }, flags: ['scopeBoundary'],
        reactions: [{ id: 'scope-ok-b', author: 'olga', text: 'Поняла. Условия честные, но клиент рассчитывал увидеть жест доброй воли уже сегодня.' }],
        insight: 'Вы сохранили управляемость текущего дня, пожертвовав частью эмоционального кредита у клиента.',
      },
      {
        id: 'trade-feature', label: 'C', text: 'Меняем новый блок на один из старых элементов объёма.',
        effects: { deadlines: 1, budget: 2, team: -1, client: 2 }, flags: ['scopeTradeoff'],
        reactions: [{ id: 'scope-ok-c', author: 'olga', text: 'Предложу обмен внутри объёма. Если выберут приоритет, общий размер задачи не вырастет.' }],
        insight: 'Обмен приоритетов сохранил объём и дал клиенту выбор без скрытого расширения работ.',
      },
    ],
  },
  {
    id: 'client-escalation',
    stage: 6,
    time: '13:18',
    title: 'Запрос стал эскалацией',
    context: 'Неоформленное изменение вернулось как ожидание руководства клиента.',
    thread: 'Клиент',
    when: hasFlag('scopeNegotiated', false),
    messages: [
      { id: 'scope-bad-1', author: 'olga', time: '13:18', tone: 'urgent', text: 'Клиент подключил своего руководителя. Теперь вопрос звучит не «сделаете ли», а «почему это ещё не в плане».' },
    ],
    conditionalMessages: [
      { id: 'scope-bad-silent', author: 'vera', when: hasFlag('acceptSilently'), text: 'Потому что устное «сделаем» уже услышали как бесплатное обязательство.' },
      { id: 'scope-bad-refuse', author: 'olga', when: hasFlag('refuseChange'), text: 'После сухого отказа они хотят разговаривать уже не про объём, а про партнёрство.' },
    ],
    choices: [
      {
        id: 'reset-expectations', label: 'A', text: 'Созваниваемся и заново фиксируем объём, цену и дату.',
        effects: { deadlines: -4, budget: 4, team: 2, client: -2 }, flags: ['scopeReset'],
        reactions: [{ id: 'scope-bad-a', author: 'olga', text: 'Соберу звонок. Разговор поздний, но письменная реальность всё ещё лучше устной фантазии.' }],
        insight: 'Поздняя фиксация условий стоила доверия, зато остановила дальнейший рост скрытого обязательства.',
      },
      {
        id: 'absorb-change', label: 'B', text: 'Берём изменение на себя и закрываем вопрос.',
        effects: { deadlines: -9, budget: -9, team: -8, client: 7 }, flags: ['scopeDebt'],
        reactions: [{ id: 'scope-bad-b', author: 'olga', text: 'Клиент услышит «да». Внутри проекта это прозвучит намного громче.' }],
        insight: 'Вы защитили отношения внешне, но усилили скрытый долг по ресурсам и команде.',
      },
      {
        id: 'minimum-change', label: 'C', text: 'Предлагаем минимальный вариант сегодня, остальное — отдельным этапом.',
        effects: { deadlines: -3, budget: -2, team: -2, client: 3 }, flags: ['minimumScope', 'scopeBoundary'],
        reactions: [{ id: 'scope-bad-c', author: 'olga', tone: 'positive', text: 'Дам им конкретный минимум и дату продолжения. Это уже решение, а не спор о принципах.' }],
        insight: 'Минимальный результат восстановил диалог и ограничил ущерб, не решив проблему полностью.',
      },
    ],
  },
  {
    id: 'finance-ceiling',
    stage: 7,
    time: '14:03',
    title: 'Резерв почти выбран',
    context: 'Финансы просят определить, что сегодня действительно критично.',
    thread: 'Ресурсы',
    messages: [
      { id: 'finance-1', author: 'vera', time: '14:03', tone: 'urgent', text: 'До внутреннего лимита осталось немного. Ещё один срочный платёж — и завтра мы начнём с объяснений вместо работы.' },
    ],
    conditionalMessages: [
      { id: 'finance-cond-reserve', author: 'vera', when: hasFlag('reserveSupplier'), text: 'Экстренная закупка утром съела большую часть манёвра.' },
      { id: 'finance-cond-scope', author: 'vera', when: hasFlag('scopeDebt'), text: 'Неоформленный клиентский объём уже работает как расход, хотя в доходах его нет.' },
    ],
    choices: [
      {
        id: 'freeze-secondary', label: 'A', text: 'Замораживаем все второстепенные расходы до завтра.',
        effects: { budget: 9, deadlines: -3, team: -3 }, flags: ['budgetFreeze'],
        reactions: [{ id: 'finance-a', author: 'vera', tone: 'positive', text: 'Фиксирую стоп-лист. Манёвр вернём, часть удобных решений сегодня потеряем.' }],
        insight: 'Жёсткая приоритизация восстановила резерв, но сделала оставшуюся работу менее удобной и чуть медленнее.',
      },
      {
        id: 'request-reserve', label: 'B', text: 'Запрашиваем дополнительный резерв у руководства.',
        effects: { budget: 12, client: -1 }, flags: ['askedExecutiveReserve'],
        availableWhen: any(relationship('vera', 'gte', 58), hasFlag('scopeNegotiated')),
        unavailableReason: 'Финансы не готовы поддержать запрос без доверия или оформленного клиентского объёма.',
        reactions: [{ id: 'finance-b', author: 'vera', text: 'Подготовлю цифры. Деньги возможны, вместе с ними придут вопросы и контроль.' }],
        insight: 'Вы расширили финансовый коридор, но сделали состояние проекта предметом внимания руководства.',
      },
      {
        id: 'keep-spending', label: 'C', text: 'Не тормозим день из-за внутреннего лимита.',
        effects: { deadlines: 5, budget: -10, team: 1 }, flags: ['budgetRisk'],
        reactions: [{ id: 'finance-c', author: 'vera', text: 'Приняла. Тогда каждое следующее «срочно» должно будет объяснить, почему оно важнее завтрашнего дня.' }],
        insight: 'Вы сохранили скорость и свободу действий сейчас, приблизив финансовую границу.',
      },
    ],
  },
  {
    id: 'executive-checkin',
    stage: 8,
    time: '14:47',
    title: 'Руководство просит статус',
    context: 'Нужен короткий ответ: всё ли под контролем и что требуется решить.',
    thread: 'Управление',
    messages: [
      { id: 'exec-1', author: 'vera', time: '14:47', text: 'У нас пять минут до звонка. Нужен один статус, один риск и один запрос. Желательно правдивые.' },
      { id: 'exec-2', author: 'alexey', time: '14:48', text: 'Производство работает. Но обещать финал без оговорок я бы сейчас не стал.' },
    ],
    messageVariants: [
      [{ id: 'exec-variant-board', author: 'vera', text: 'В презентации уже стоит зелёный статус. Если меняем — нужна ясная причина.' }],
      [{ id: 'exec-variant-question', author: 'alexey', text: 'На прошлом статусе нас просили не приносить сюрпризы. Сегодня это особенно актуально.' }],
    ],
    choices: [
      {
        id: 'transparent-brief', label: 'A', text: 'Показываем реальный статус, риск и план его ограничения.',
        effects: { deadlines: -2, budget: 2, team: 4, client: 1 }, flags: ['transparentStatus'],
        reactions: [{ id: 'exec-a', author: 'vera', tone: 'positive', text: 'Хорошо. Честный статус сложнее произнести, зато после него можно получить полезное решение.' }],
        insight: 'Прозрачность укрепила внутреннее доверие и сохранила пространство для реального управленческого решения.',
      },
      {
        id: 'promise-today', label: 'B', text: 'Подтверждаем: сегодня точно закончим.',
        effects: { deadlines: 7, team: -6, client: 2 }, flags: ['hardPromise'],
        reactions: [{ id: 'exec-b', author: 'alexey', text: 'Принял. Тогда оговорки превращаются в вечернюю смену.' }],
        delayedConsequences: [{
          id: 'hard-promise-pressure', afterEvents: 2, effects: { team: -5 },
          messages: [{ id: 'hard-promise-message', author: 'irina', tone: 'urgent', text: 'Команда узнала про обещание «точно сегодня». Теперь это не ориентир, а личный долг каждого.' }],
        }],
        insight: 'Жёсткое обещание мобилизовало проект, но переложило неопределённость на команду.',
      },
      {
        id: 'request-priority', label: 'C', text: 'Просим руководство снять одну из конкурирующих задач.',
        effects: { deadlines: 4, budget: 1, team: 6, client: -2 }, flags: ['priorityCleared'],
        availableWhen: relationship('irina', 'gte', 58),
        unavailableReason: 'Команда не поддержит эскалацию при текущем уровне рабочего доверия.',
        reactions: [{ id: 'exec-c', author: 'irina', tone: 'positive', text: 'Если снимут параллельную задачу, люди наконец будут работать с одним главным приоритетом.' }],
        insight: 'Эскалация помогла очистить фокус, но потребовала признать ограниченность проекта.',
      },
    ],
  },
  {
    id: 'team-conflict',
    stage: 9,
    time: '15:32',
    title: 'Команда начинает гореть',
    context: 'Работа движется, но люди спорят, кто закрывает чужие задачи.',
    thread: 'Команда',
    messages: [
      { id: 'team-1', author: 'irina', time: '15:32', tone: 'urgent', text: 'Два человека поссорились из-за того, кто третий раз подхватывает чужой участок. Кажется, оба в целом правы.' },
    ],
    conditionalMessages: [
      { id: 'team-cond-overload', author: 'irina', when: hasFlag('overloadEmployee'), text: 'После истории с Антоном разговор про «все должны помочь» звучит особенно плохо.' },
      { id: 'team-cond-priority', author: 'irina', when: hasFlag('priorityCleared'), tone: 'positive', text: 'Снятая параллельная задача дала нам немного воздуха. Его можно потратить на разговор.' },
    ],
    choices: [
      {
        id: 'resolve-conflict', label: 'A', text: 'Останавливаемся на 15 минут и разбираем конфликт.',
        effects: { deadlines: -6, team: 14, client: -1 }, flags: ['teamReset'],
        reactions: [{ id: 'team-a', author: 'irina', tone: 'positive', text: 'Собираю всех. Пятнадцать минут сейчас могут сэкономить два часа вечером.' }],
        insight: 'Короткая остановка восстановила рабочее соглашение и снизила риск скрытого саботажа.',
      },
      {
        id: 'defer-conflict', label: 'B', text: 'Сначала закрываем задачу, разговор — после отгрузки.',
        effects: { deadlines: 6, team: -13 }, flags: ['conflictDeferred'],
        reactions: [{ id: 'team-b', author: 'irina', text: 'Передам. Задачу закроем. Разговор после неё теперь точно никуда не денется.' }],
        insight: 'Вы сохранили темп, но усилили конфликт и сделали следующий сбой вероятнее.',
      },
      {
        id: 'drop-secondary-work', label: 'C', text: 'Снимаем второстепенные задачи и перераспределяем нагрузку.',
        effects: { deadlines: -2, budget: -3, team: 9, client: -2 }, flags: ['workloadReset'],
        reactions: [{ id: 'team-c', author: 'irina', tone: 'positive', text: 'Оставлю только то, без чего сегодняшний результат не существует. Остальное честно перенесём.' }],
        insight: 'Снижение нагрузки вернуло справедливость, но часть внешних и внутренних обещаний пришлось перенести.',
      },
    ],
  },
  {
    id: 'team-overheat',
    stage: 10,
    time: '16:18',
    title: 'У людей кончился резерв',
    context: 'Следующий час определит, превратится ли усталость в ошибку.',
    thread: 'Команда',
    when: any(stat('team', 'lte', 50), hasFlag('overloadEmployee'), hasFlag('overtimePrep')),
    messages: [
      { id: 'overheat-1', author: 'irina', time: '16:18', tone: 'urgent', text: 'Темп падает. Люди перепроверяют друг друга и всё равно ошибаются. Ещё один рывок возможен, но он будет последним.' },
    ],
    choices: [
      {
        id: 'rotate-break', label: 'A', text: 'Делаем ротацию и короткие обязательные паузы.',
        effects: { deadlines: -5, team: 10 }, flags: ['teamRecovery'],
        reactions: [{ id: 'overheat-a', author: 'irina', tone: 'positive', text: 'Разведу людей по участкам и введу паузы. Скорость на час снизится, количество ошибок — тоже.' }],
        insight: 'Восстановление снизило краткосрочный темп, но вернуло способность команды работать без новых ошибок.',
      },
      {
        id: 'spot-bonus', label: 'B', text: 'Фиксируем доплату за вечер и просим последний рывок.',
        effects: { deadlines: 6, budget: -10, team: 1 }, flags: ['paidOvertime'],
        availableWhen: stat('budget', 'gte', 25),
        unavailableReason: 'В бюджете нет безопасного резерва для доплаты.',
        reactions: [{ id: 'overheat-b', author: 'vera', text: 'Доплату проведём. Деньги не отменяют усталость, но хотя бы честно признают её цену.' }],
        insight: 'Оплаченный рывок сохранил скорость и честность обмена, но не устранил риск усталости.',
      },
      {
        id: 'push-through', label: 'C', text: 'Дожимаем без новых условий — осталось немного.',
        effects: { deadlines: 8, team: -12, client: 1 }, flags: ['teamExhausted'],
        reactions: [{ id: 'overheat-c', author: 'irina', text: 'Передам. Только «немного» сегодня уже звучало несколько раз.' }],
        insight: 'Вы поставили финальный результат выше устойчивости людей и почти исчерпали командный ресурс.',
      },
    ],
  },
  {
    id: 'team-rally',
    stage: 10,
    time: '16:18',
    title: 'Появилось окно для манёвра',
    context: 'Команда держится и может вложить остаток энергии осознанно.',
    thread: 'Команда',
    when: all(stat('team', 'gt', 50), hasFlag('overloadEmployee', false), hasFlag('overtimePrep', false)),
    messages: [
      { id: 'rally-1', author: 'irina', time: '16:18', tone: 'positive', text: 'У нас есть редкое окно: текущий поток стабилен. Можно усилить финальную проверку, помочь клиентскому блоку или сохранить темп.' },
    ],
    choices: [
      {
        id: 'peer-review', label: 'A', text: 'Ставим парную проверку на финальный участок.',
        effects: { deadlines: -3, team: 3, client: 3 }, flags: ['qualityPairing'],
        reactions: [{ id: 'rally-a', author: 'alexey', tone: 'positive', text: 'Поставлю вторую пару глаз на выпуск. Чуть медленнее, заметно спокойнее.' }],
        insight: 'Парная проверка превратила командный запас в снижение финального риска.',
      },
      {
        id: 'help-client-block', label: 'B', text: 'Направляем свободную пару на клиентское изменение.',
        effects: { deadlines: -2, team: -2, client: 7 }, flags: ['clientAssist'],
        availableWhen: relationship('olga', 'gte', 58),
        unavailableReason: 'Аккаунт не готов расширять обещание при текущем уровне доверия.',
        reactions: [{ id: 'rally-b', author: 'olga', tone: 'positive', text: 'Покажем клиенту дополнительный прогресс. Главное — не сделать этот жест новым стандартом.' }],
        insight: 'Свободная ёмкость укрепила клиентское доверие, немного сократив внутренний резерв.',
      },
      {
        id: 'protect-capacity', label: 'C', text: 'Не добавляем задач и сохраняем устойчивый темп.',
        effects: { deadlines: 3, team: 5, budget: 1 }, flags: ['capacityProtected'],
        reactions: [{ id: 'rally-c', author: 'irina', text: 'Хорошо. Редкое управленческое решение: не заполнять свободное окно новой срочностью.' }],
        insight: 'Вы защитили рабочий ритм и не превратили появившийся запас в новый набор обязательств.',
      },
    ],
  },
  {
    id: 'client-status',
    stage: 11,
    time: '17:12',
    title: 'Клиент просит финальный прогноз',
    context: 'До отгрузки меньше часа, а часть рисков всё ещё жива.',
    thread: 'Клиент',
    messages: [
      { id: 'status-1', author: 'olga', time: '17:12', tone: 'urgent', text: 'Нужна формулировка для клиента прямо сейчас: что он получит сегодня и в каком состоянии.' },
    ],
    messageVariants: [
      [{ id: 'status-variant-channel', author: 'olga', text: 'Клиент просит ответить письменно — формулировка останется в переписке.' }],
      [{ id: 'status-variant-director', author: 'olga', text: 'Ответ ждёт уже не только менеджер, но и директор со стороны клиента.' }],
    ],
    conditionalMessages: [
      { id: 'status-cond-truth', author: 'olga', when: hasFlag('transparentStatus'), text: 'После честного внутреннего статуса у нас хотя бы одна версия реальности.' },
      { id: 'status-cond-quality', author: 'alexey', when: hasFlag('qualityPressure'), text: 'Технически выпуск возможен, но только если финальная проверка не найдёт продолжение истории.' },
    ],
    choices: [
      {
        id: 'honest-forecast', label: 'A', text: 'Даём честный прогноз с риском и временем следующего обновления.',
        effects: { deadlines: -2, client: 7, team: 2 }, flags: ['honestForecast'],
        reactions: [{ id: 'status-a', author: 'olga', tone: 'positive', text: 'Отправлю конкретный статус и вернусь через сорок минут. Неприятная ясность лучше приятного сюрприза.' }],
        insight: 'Прозрачный прогноз укрепил доверие и снизил внутреннее давление, не обещая невозможного.',
      },
      {
        id: 'partial-plan', label: 'B', text: 'Предлагаем частичный результат сегодня и точную дату остатка.',
        effects: { deadlines: 3, budget: -3, team: 2, client: 5 }, flags: ['partialShipment'],
        availableWhen: any(hasFlag('segmentedBatch'), hasFlag('qualityContained'), hasFlag('scopeBoundary')),
        unavailableReason: 'Сначала нужен отделимый и проверенный объём.',
        reactions: [{ id: 'status-b', author: 'olga', tone: 'positive', text: 'Разделю объём и зафиксирую вторую дату. Клиент получит результат без обещаний про магию.' }],
        insight: 'Подготовленная этапность дала клиенту ценность сегодня и сохранила контроль над остатком.',
      },
      {
        id: 'confident-forecast', label: 'C', text: 'Подтверждаем полный результат сегодня без оговорок.',
        effects: { deadlines: 7, team: -5, client: 3 }, flags: ['finalPromise'],
        reactions: [{ id: 'status-c', author: 'alexey', text: 'Тогда всё внимание в выпуск. Пространства для новой проблемы больше нет.' }],
        insight: 'Уверенное обещание удержало ожидание клиента, но убрало последний запас времени и команды.',
      },
    ],
  },
  {
    id: 'shipping-decision',
    stage: 12,
    time: '18:06',
    title: 'Финальное решение',
    context: 'Машина ждёт. Решение сейчас определит итог всего рабочего дня.',
    thread: 'Качество',
    timedDecision: { seconds: 35, fallbackChoiceId: 'delay-quality' },
    messages: [
      { id: 'shipping-1', author: 'alexey', time: '18:06', text: 'Основной объём готов. Для ещё одной полной проверки нужно полтора часа.' },
      { id: 'shipping-2', author: 'olga', time: '18:07', text: 'Клиент на связи и ждёт подтверждение. Что отправляем?' },
    ],
    conditionalMessages: [
      { id: 'shipping-cond-risk', author: 'alexey', when: hasFlag('qualityRisk'), tone: 'urgent', text: 'После дневного решения продолжать при отклонении я бы лично всё ещё раз проверил.' },
      { id: 'shipping-cond-pair', author: 'alexey', when: hasFlag('qualityPairing'), tone: 'positive', text: 'Парная проверка закрыла критический участок. По нему у меня вопросов нет.' },
      { id: 'shipping-cond-promise', author: 'olga', when: hasFlag('finalPromise'), text: 'Мы уже подтвердили полный результат сегодня. Любое другое решение придётся объяснять сразу.' },
    ],
    choices: [
      {
        id: 'ship-now', label: 'A', text: 'Отправляем весь объём сегодня.',
        effects: { deadlines: 13, budget: 2, team: -5, client: 5 }, flags: ['shipNow'],
        reactions: [
          { id: 'shipping-a-1', author: 'alexey', text: 'Закрываем документы и выпускаем машину.' },
          { id: 'shipping-a-2', author: 'olga', text: 'Подтверждаю клиенту сегодняшнюю отправку. Телефон пока не выключаю.' },
        ],
        insight: 'Вы защитили срок и ожидание клиента, приняв остаточный риск качества и усталости.',
      },
      {
        id: 'delay-quality', label: 'B', text: 'Задерживаем отгрузку и проводим полную проверку.',
        effects: { deadlines: -13, budget: -3, team: 5, client: -7 }, flags: ['delayForQuality', 'qualityFirst'],
        reactions: [
          { id: 'shipping-b-1', author: 'alexey', tone: 'positive', text: 'Остаёмся на проверку. Завтра будем точно знать, что отправляем.' },
          { id: 'shipping-b-2', author: 'olga', text: 'Возьму неприятный звонок на себя. Рекламация была бы неприятнее.' },
        ],
        insight: 'Вы выбрали доказанное качество ценой срока и сложного разговора с клиентом.',
      },
      {
        id: 'ship-partial', label: 'C', text: 'Отправляем проверенную часть, остаток — по отдельной дате.',
        effects: { deadlines: 3, budget: -4, team: 2, client: 3 }, flags: ['partialShipment'],
        availableWhen: any(hasFlag('partialShipment'), hasFlag('segmentedBatch'), hasFlag('qualityContained'), hasFlag('qualityPairing'), hasFlag('scopeBoundary')),
        unavailableReason: 'В течение дня не был подготовлен отделимый проверенный объём.',
        reactions: [
          { id: 'shipping-c-1', author: 'olga', tone: 'positive', text: 'Фиксирую состав партии и вторую дату. Никаких сюрпризов в формулировках.' },
          { id: 'shipping-c-2', author: 'alexey', text: 'Отделяю проверенный объём. Остальное спокойно закончим следом.' },
        ],
        insight: 'Частичная поставка сохранила часть срока и доверия, потребовав дополнительной логистики и ясной коммуникации.',
      },
    ],
  },
]

const EXPRESS_STAGE_BY_EVENT = {
  'supply-delay': 1,
  'missing-employee': 2,
  'client-change': 3,
  'quality-signal': 4,
  'team-overheat': 5,
  'team-rally': 5,
  'shipping-decision': 6,
} as const

export const scenario: GameEvent[] = scenarioCatalog.flatMap((event) => {
  const stage = EXPRESS_STAGE_BY_EVENT[event.id as keyof typeof EXPRESS_STAGE_BY_EVENT]
  return stage ? [{ ...event, stage }] : []
})

# меню

# [main menu](#mainmenu)

# [bowling menu](#splashscreen_bowling)

## routes

- [tests menu](#testsmenu)
- [log](#log)

## tests

- [bowling](#testcase8)
- [test case 1](#testcase1)
- [танки](?#testcase2)
- [танки - первая карта](?map=a#testcase2)

`было сказано, что каждый случай отключения будет рассматриваться самим Куратором.`

# bowling congif

## _generic_

| key           | description                       |
| ------------- | --------------------------------- |
| `zoom_on_aim` | отдаление камеры при прицеливании |

## _overlay_

| key                 | description                               |
| ------------------- | ----------------------------------------- |
| `show_enemy_energy` | показывает энергию врагов                 |
| `split_bars`        | разбивает полоски ХП, энергии на сегменты |

## _pawn_behabiour_

| key                           | description                                |
| ----------------------------- | ------------------------------------------ |
| `shoot_instant`               | мгновенный выстрел без чарджа              |
| `shoot_limit`                 | максимальное количество зарядов            |
| `shoot_limit_recharge`        | время перезарядки                          |
| `hearts_limit`                | кол-во хп                                  |
| `hearts_limit_recharge`       | время перезарядки хп                       |
| `aim_direction_priority`      | приоритет прицеливанию                     |
| `stabilization_factor`        | сила вертикализации                        |
| `projectile_scale`            | множитель размера снаряда                  |
| `movespeed`                   | скорость движения                          |
| `hearts_limit_recharge_delay` | задержка восстановления ХП                 |
| `shoot_limit_recharge_delay`  | задержка восстановления снарядов           |
| `hurt_damage_impulse`         | дополнительный импульс при получении урона |

## _projectile_

| key                  | description                        |
| -------------------- | ---------------------------------- |
| `lifespan`           | время жизни                        |
| `impulse`            | сила броска                        |
| `ldamping`           | сопротивление движения             |
| `density`            | плотность (масса=плотность\*объем) |
| `scale`              | множитель размера                  |
| `hearts_hurt_damage` | получаемый урон                    |

## _bots_

| key                          | description                                                |
| ---------------------------- | ---------------------------------------------------------- |
| `safe_distance`              | расстояние, на котором бот держится от цели                |
| `safe_distance_spread`       | разброс безопасного расстояния (По синусоиде)              |
| `safe_distance_spread_speed` | частота синусоиды                                          |
| `waving_distance`            | расстояние стрейфа влево-вправо от цели                    |
| `waving_speed`               | скорость переключения стрейфа влево-вправо                 |
| `attack_distance`            | расстояние, на котором бот атакует                         |
| `attack_cooldown`            | промежуток между атаками                                   |
| `target_switch_cooldown`     | промежуток между переключениями цели                       |
| `dodge_awareness`            | реакция бота на летящие в него снаряды (0 - игнорирование) |

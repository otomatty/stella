-- 開発ラボG 01章の動画 1-1 を作り直すため、旧 4 本の視聴記録を一度だけ消す。
DELETE FROM `lesson_progress` WHERE `lesson_id` IN (
  '5630736b-314e-58d4-a2c4-80783c832584',
  '95870be9-6dfc-512b-89e2-2b7acd64ab74',
  'c0682e92-a716-54de-9135-e056854c0dc3',
  '70b7597e-192f-5c06-96b6-19692b11c6eb'
);

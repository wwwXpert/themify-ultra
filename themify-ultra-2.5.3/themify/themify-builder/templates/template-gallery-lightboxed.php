<?php
if (!defined('ABSPATH'))
    exit; // Exit if accessed directly
/**
 * Template Gallery Lightboxed
 * 
 * Access original fields: $fields_args
 * @author Themify
 */
$alt = isset($args['settings']['gallery_images'][0]->post_excerpt) ? $args['settings']['gallery_images'][0]->post_excerpt : '';

/* if no thumbnail is set   for the gallery, use the first image */
if (empty($args['settings']['thumbnail_gallery'])) {
    $args['settings']['thumbnail_gallery'] = wp_get_attachment_url($args['settings']['gallery_images'][0]->ID);
}
$thumbnail = themify_get_image("ignore=true&src={$args['settings']['thumbnail_gallery']}&w={$args['settings']['thumb_w_gallery']}&h={$args['settings']['thumb_h_gallery']}&alt={$alt}");
foreach ($args['settings']['gallery_images'] as $key => $image):
    ?>
    <dl class="gallery-item"<?php if($key!==0):?> style="display: none;"<?php endif;?>>
        <?php
        $link = wp_get_attachment_url($image->ID);
        $img = wp_get_attachment_image_src($image->ID, 'full');
        $alt = get_post_meta($image->ID, '_wp_attachment_image_alt', true);
        $title = $image->post_title;
        $caption = $image->post_excerpt;
        if (!empty($link)):
            ?>
            <dt class="gallery-icon"><a href="<?php echo esc_url($link) ?>" title="<?php  esc_attr_e($title) ?>">
            <?php endif; ?>
            <?php
            echo $key === 0 ? $thumbnail : $img[1];
            if (!empty($link)):
                ?>
            </a></dt>
        <?php endif; ?>
        <dd<?php if ($args['settings']['gallery_image_title'] === 'yes' && $title !== ''): ?> class="wp-caption-text gallery-caption"<?php endif; ?>>
            <?php if ($args['settings']['gallery_image_title'] === 'yes' && $title!==''): ?>
                <strong class="themify_image_title"><?php echo $title; ?></strong>
            <?php endif; ?>
            <?php if ($args['settings']['gallery_exclude_caption'] !== 'yes' && $caption!==''): ?>
                <span class="themify_image_caption<?php echo 'no' === $args['settings']['lightbox_title']?' tb_hide_lightbox_title':''; ?>"><?php echo $caption; ?></span>
            <?php endif ?>
        </dd>
    </dl>

<?php endforeach; // end loop  ?>

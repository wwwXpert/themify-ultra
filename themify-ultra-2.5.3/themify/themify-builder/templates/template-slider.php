<?php
if (!defined('ABSPATH'))
    exit; // Exit if accessed directly
///////////////////////////////////////
// Switch Template Layout Types
///////////////////////////////////////
$template_name = isset($args['mod_settings']['layout_display_slider']) ? $args['mod_settings']['layout_display_slider'] : 'blog';
$isLoop=$ThemifyBuilder->in_the_loop===true;
if (in_array($template_name, array('blog', 'portfolio', 'testimonial', 'slider'),true)) {
    $template_name = 'blog';
    $ThemifyBuilder->in_the_loop = true;
}
if (TFCache::start_cache($args['mod_name'], self::$post_id, array('ID' => $args['module_ID']))) {
    $slider_default = array(
        'layout_display_slider' => 'blog',
        'open_link_new_tab_slider' => 'no',
        'mod_title_slider' => '',
        'layout_slider' => '',
        'img_h_slider' => '',
        'img_w_slider' => '',
        'img_fullwidth_slider' => '',
        'image_size_slider' => '',
        'visible_opt_slider' => '',
        'mob_visible_opt_slider' => '',
        'auto_scroll_opt_slider' => 0,
        'scroll_opt_slider' => '',
        'speed_opt_slider' => '',
        'effect_slider' => 'scroll',
        'pause_on_hover_slider' => 'resume',
        'wrap_slider' => 'yes',
        'show_nav_slider' => 'yes',
        'show_arrow_slider' => 'yes',
        'show_arrow_buttons_vertical' => '',
        'unlink_feat_img_slider'=>'no',
        'unlink_post_title_slider'=>'no',
        'left_margin_slider' => '',
        'right_margin_slider' => '',
        'css_slider' => '',
        'animation_effect' => '',
        'height_slider' => 'variable'
    );

    $fields_args = wp_parse_args($args['mod_settings'], $slider_default);
    unset($args['mod_settings']);
    $arrow_vertical = $fields_args['show_arrow_slider'] === 'yes' && $fields_args['show_arrow_buttons_vertical'] === 'vertical' ? 'themify_builder_slider_vertical' : '';
    $fullwidth_image = $fields_args['img_fullwidth_slider'] === 'fullwidth' ? 'slide-image-fullwidth' : '';
    $mod_name=$args['mod_name'];
    $container_class =apply_filters('themify_builder_module_classes', array(
        'module clearfix themify_builder_slider_wrap', 
	'module-' . $mod_name, 
	$args['module_ID'],
	$fields_args['css_slider'], 
	$fields_args['layout_slider'],
	self::parse_animation_effect($fields_args['animation_effect'], $fields_args), 
	$arrow_vertical, 
	$fullwidth_image
                    ), $mod_name, $args['module_ID'], $fields_args);
    if(!empty($args['element_id'])){
	$elementId= 'tb_'.$args['element_id'];
	$container_class[] = $elementId;
    }
    else{
	$elementId=$args['module_ID'];
    }
    $container_props = apply_filters('themify_builder_module_container_props', array(
        'class' =>  implode(' ', $container_class),
            ), $fields_args, $mod_name, $args['module_ID']);
    $args=null;
    $margins = '';
    if ($fields_args['left_margin_slider'] !== '') {
        $margins.='margin-left:' . $fields_args['left_margin_slider'] . 'px;';
    }
    if ($fields_args['right_margin_slider'] !== '') {
        $margins.='margin-right:' . $fields_args['right_margin_slider'] . 'px;';
    }
    $fields_args['margin'] = $margins;
    $speed = $fields_args['speed_opt_slider'] === 'slow' ? 4 : ($fields_args['speed_opt_slider'] === 'fast' ? '.5' : 1);
    ?>
    <div class="tb_slider_loader"></div>
    <div <?php echo self::get_element_attributes(self::sticky_element_props($container_props,$fields_args)); ?>>
	<?php $container_props=$container_class=null; ?>
        <?php if ($fields_args['mod_title_slider'] !== ''): ?>
            <?php echo $fields_args['before_title'] . apply_filters('themify_builder_module_title', $fields_args['mod_title_slider'], $fields_args). $fields_args['after_title']; ?>
        <?php endif; ?>
        <ul class="themify_builder_slider"
	    data-id="<?php echo $elementId?>"
            data-visible="<?php echo isset($fields_args['horizontal']) && $fields_args['horizontal'] === 'yes' ? '4' : $fields_args['visible_opt_slider'] ?>"
            data-mob-visible="<?php echo $fields_args['mob_visible_opt_slider'] ?>"
            data-scroll="<?php echo $fields_args['scroll_opt_slider']; ?>" 
            data-auto-scroll="<?php echo $fields_args['auto_scroll_opt_slider'] ?>"
            data-speed="<?php echo $speed ?>"
            data-wrap="<?php echo $fields_args['wrap_slider']; ?>"
            data-arrow="<?php echo $fields_args['show_arrow_slider']; ?>"
            data-pagination="<?php echo $fields_args['show_nav_slider']; ?>"
            data-effect="<?php echo $fields_args['effect_slider'] ?>" 
            data-height="<?php echo isset($fields_args['horizontal']) && $fields_args['horizontal'] === 'yes' ? 'variable' : $fields_args['height_slider'] ?>"
            data-pause-on-hover="<?php echo $fields_args['pause_on_hover_slider'] ?>"
            data-horizontal="<?php echo isset($fields_args['horizontal'])?$fields_args['horizontal']:'' ?>"
            <?php if ($template_name === 'video'): ?>data-type="video"<?php endif; ?>>
                <?php
                self::retrieve_template('template-' . $mod_name . '-' . $template_name . '.php', array(
                    'module_ID' => $elementId,
                    'mod_name' => $mod_name,
                    'settings' => $fields_args
                        ), '', '', true);
                ?>
        </ul>
    </div>
        <?php
}
TFCache::end_cache();
$ThemifyBuilder->in_the_loop = $isLoop;
    
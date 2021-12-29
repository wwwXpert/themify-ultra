<?php
/**
 * Template for search form.
 * @package themify
 * @since 1.0.0
 */
Themify_Enqueue_Assets::loadThemeStyleModule('search-form');
$search_form=themify_theme_show_area( 'search_form' )?themify_get('setting_search_form',false,true):false;
$s = $search_form !== 'search_form' && $search_form!==false?'':get_search_query();
?>
<form method="get" id="searchform" action="<?php echo home_url(); ?>/">
	
    <div class="icon-search"><?php echo themify_get_icon('search','ti',false,false,array('aria-label'=>__('Search','themify'))); ?></div>
    <span class="tf_loader tf_hide"></span>
    <input type="text" name="s" id="s" title="<?php _e( 'Search', 'themify' ); ?>" placeholder="<?php _e( 'Search', 'themify' ); ?>" value="<?php echo $s; ?>" />

    <?php if(themify_is_woocommerce_active() && 'product' === themify_get( 'setting-search_post_type','all',true )): ?>
        <input type="hidden" name="post_type" value="product" />
    <?php endif; ?>

</form>

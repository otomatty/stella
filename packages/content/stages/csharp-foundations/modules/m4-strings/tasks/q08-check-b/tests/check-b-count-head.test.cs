public class CheckBCountHeadTests
{
    [Fact(DisplayName = "確認B 先頭と同じ個数")]
    public void CheckBCountHead()
    {
        Assert.Equal(3, Answers.CheckBCountHead("abaca"));
        Assert.Equal(0, Answers.CheckBCountHead(""));
        Assert.Equal(1, Answers.CheckBCountHead("x"));
        Assert.Equal(1, Answers.CheckBCountHead("ABa"));
    }
}

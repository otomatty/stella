public class S06LastIndexOfTests
{
    [Fact(DisplayName = "S06 最後の該当位置")]
    public void S06LastIndexOf()
    {
        Assert.Equal(5, Answers.S06LastIndexOf("banana", 'a'));
        Assert.Equal(-1, Answers.S06LastIndexOf("abc", 'z'));
        Assert.Equal(-1, Answers.S06LastIndexOf("", 'a'));
        Assert.Equal(0, Answers.S06LastIndexOf("a", 'a'));
        Assert.Equal(0, Answers.S06LastIndexOf("abc", 'a'));
    }
}

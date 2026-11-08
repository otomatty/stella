public class Q22HeadNTests
{
    [Fact(DisplayName = "Q22 先頭 N 文字")]
    public void Q22HeadN()
    {
        Assert.Equal("ab", Answers.Q22HeadN("abcdef", 2));
        Assert.Equal("abcdef", Answers.Q22HeadN("abcdef", 6));
        Assert.Equal("A", Answers.Q22HeadN("A", 1));
        Assert.Equal("", Answers.Q22HeadN("ab", 0));
    }
}

public class Q13CountSpacesTests
{
    [Fact(DisplayName = "Q13 空白の個数")]
    public void Q13CountSpaces()
    {
        Assert.Equal(2, Answers.Q13CountSpaces("a b c"));
        Assert.Equal(0, Answers.Q13CountSpaces("abc"));
        Assert.Equal(3, Answers.Q13CountSpaces("   "));
        Assert.Equal(0, Answers.Q13CountSpaces(""));
    }
}

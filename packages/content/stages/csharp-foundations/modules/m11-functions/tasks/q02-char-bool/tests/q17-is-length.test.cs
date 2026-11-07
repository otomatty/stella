public class Q17IsLengthTests
{
    [Fact(DisplayName = "Q17 長さがnか")]
    public void Q17IsLength()
    {
        Assert.Equal(true, Answers.Q17IsLength("abc", 3));
        Assert.Equal(false, Answers.Q17IsLength("ab", 3));
    }
}
